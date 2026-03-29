import { computed, ref, type ComputedRef, type Ref } from "vue";
import type { ImageInstance } from "./FileSystem";
import { CalculateDefaultCrop, CalculateImageMD5, PicaCropResize, TxtAsBlob } from "./Functions";
import type { Rect } from "./Types";
import { GetSavedCategoryCopy } from "./TagModel";

export interface ProjectV1CropRect extends Rect {
    bucket: string;
    tags: string[];
    selected_tags: string[];
}

export interface ProjectV1File {
    srcfilename: string;
    name: string;
    md5: string;

    crops: ProjectV1CropRect[];
}

export interface ProjectV1Bucket {
	width: number;
	height: number;
	ratio: number;
}

export interface ProjectBase {
    version: number;
}

export interface ProjectV1 extends ProjectBase {
    files: ProjectV1File[];
    buckets: { [key: string]: ProjectV1Bucket; };
}

export enum ImageItemBucketStatus {
    NO_BUCKET = 0,
    BUCKET_NORMAL = 1,
    BUCKET_UPSACLE = 2,
}

export interface ImageItem {
    srcfilename: string;
    md5: string;
    width: number;
    height: number;
    imgurl: string;
    crops: ProjectV1CropRect[];
}

export interface ImageItemExtra {
    bucket_status: ComputedRef<ImageItemBucketStatus>;
}

export class ProjectManager {
    public images: Ref<ImageItem[]>;
    public buckets: Ref<Map<string, ProjectV1Bucket>>;
    public extra: ImageItemExtra[];
    constructor() {
        this.images = ref<ImageItem[]>([]);
        this.buckets = ref(new Map<string, ProjectV1Bucket>());
        this.extra = [];
    }

    async ImportImages(imgs: ImageInstance[]) {
        for (var i = 0; i < imgs.length; i++) {
			const v = imgs[i];
			const idx = this.images.value.push({
                srcfilename: v.filename,
                md5: await CalculateImageMD5(v.url),
                width: v.img.naturalWidth,
                height: v.img.naturalHeight,
                imgurl: v.url,
                crops: [{
                    ...CalculateDefaultCrop({
                        width: v.img.naturalWidth,
                        height: v.img.naturalHeight,
                    }, 0.8),
                    bucket: "",
                    tags: [],
                    selected_tags: [],
                }],
			}) - 1;
            this.extra.push({
                bucket_status: computed(() => {
                    const item = this.images.value[idx];
                    let ret: ImageItemBucketStatus = ImageItemBucketStatus.NO_BUCKET;
                    for (const crop of item.crops) {
                        if (crop.bucket == "") continue;
                        const bucket = this.buckets.value.get(crop.bucket);
                        if (bucket) {
                            if (bucket.width > crop.width || bucket.height > crop.height) {
                                return ImageItemBucketStatus.BUCKET_UPSACLE;
                            } else {
                                ret = ImageItemBucketStatus.BUCKET_NORMAL;
                            }
                        }
                    }
                    return ret;
                })
            })
		}
    }

    private importProjectV1(json: ProjectV1): string[] {
        const md5ToIndex = new Map<string, number>();
		this.images.value.forEach((v, i) => md5ToIndex.set(v.md5, i));

		for (const [key, value] of Object.entries(json.buckets)) {
			this.buckets.value.set(key, value);
		}

		const missingFiles: string[] = [];
		for (const value of json.files) {
			if (md5ToIndex.has(value.md5)) {
				const img = this.images.value[md5ToIndex.get(value.md5)!];
				img.crops = value.crops;
			} else {
				missingFiles.push(value.srcfilename);
			}
		}
        this.CleanUselessBuckets();
        return missingFiles;
    }

    // return missing files
    ImportProject(json: ProjectBase): string[] {
        if (json.version == 1) {
            return this.importProjectV1(json as ProjectV1);
        } else {
            alert(`Unsupported project version ${json.version}`);
        }
        return [];
    }

    CleanUselessBuckets(): number {
        const count = new Set<string>();

        for (const item of this.images.value) {
            for (const crop of item.crops) {
                if (crop.bucket != "") {
                    const bucket = this.buckets.value.get(crop.bucket);
                    if (bucket === undefined) {
                        console.error(`No bucket called ${crop.bucket} which being used in ${item.srcfilename}`);
                        crop.bucket = "";
                    } else {
                        count.add(crop.bucket);
                    }
                }
            }
        }

        // 遍历 Map，删除不在 Set 中的键
        let cnt = 0;
        for (const key of this.buckets.value.keys()) {
            if (!count.has(key)) {
                this.buckets.value.delete(key);
                cnt += 1;
            }
        }

        return cnt;
    }

    async Export(): Promise<Map<string, string | Blob>> {
        this.CleanUselessBuckets();
        let prj: ProjectV1 = {
            version: 1,
            files: [],
            buckets: Object.fromEntries(this.buckets.value.entries()),
        }

        let zipfile = new Map<string, string | Blob>();
        for (var j = 0; j < this.images.value.length; j++) {
            const v = this.images.value[j];
            if (v.crops.length > 1) throw new Error("unsupported multiple crops");
            if (v.crops.length == 0) continue;

            const crop = v.crops[0];
            let tw = crop.width, th = crop.height;
            const bucket = this.buckets.value.get(crop.bucket);
            if (bucket) {
                tw = bucket.width;
                th = bucket.height;
            }

            const name = `img${j}`;
            prj.files.push({
                srcfilename: v.srcfilename,
                name: name,
                md5: v.md5,
                crops: v.crops,
            }) - 1
            
            const croped = await PicaCropResize(v.imgurl, crop.x, crop.y, crop.width, crop.height, crop.width, crop.height);
            zipfile.set(`captions/${name}.png`, croped);

            const txt = TxtAsBlob(crop.selected_tags.join(", "));
            zipfile.set(`captions/${name}.txt`, txt);
        }

        zipfile.set(`project.json`, JSON.stringify(prj, null, 4));
        return zipfile;
    }
}
