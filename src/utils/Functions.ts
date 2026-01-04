import type { Bucket, CropRect, ImageItem, Rect, Size } from "./Types";

export function FindJsonInFileList(filelist: File[]) {
	let ret: number[] = [];
	for (var i = 0; i < filelist.length; i++) {
		const file = filelist[i];
		if (file.name.endsWith(".json")) {
			ret.push(i);
		}
	}
	return ret;
}

function cropImage<T>(imgUrl: string, x: number, y: number, w: number, h: number, tw: number, th: number, callback: (canvas: HTMLCanvasElement, resolve: (arg0: T) => void, reject: (arg0: any) => void) => void): Promise<T> {
	return new Promise((resolve, reject) => {
		const canvas = document.createElement('canvas');
		const ctx = canvas.getContext('2d');
		if (ctx == null) {
			reject(`cannot create context`);
			return;
		}
		const img = new Image();

		img.onload = function () {
			canvas.width = tw;
			canvas.height = th;
			ctx.drawImage(img, x, y, w, h, 0, 0, tw, th);

			callback(canvas, resolve, reject);
		}
		img.onerror = function (e) {
			reject(e);
		}
		img.src = imgUrl;
	});
}

export function CropImageAsBase64(imgUrl: string, x: number, y: number, w: number, h: number, tw: number, th: number) {
	return cropImage<string>(imgUrl, x, y, w, h, tw, th, (canvas, resolve, reject) => {
		resolve(canvas.toDataURL());
	});
}

export function CropImageAsBlob(imgUrl: string, x: number, y: number, w: number, h: number, tw: number, th: number) {
	return cropImage<Blob>(imgUrl, x, y, w, h, tw, th, (canvas, resolve, reject) => {
		canvas.toBlob((blob: Blob | null) => {
			if (blob == null) {
				reject(`canvas return null blob`);
			} else {
				resolve(blob);
			}
		})
	})
}

export function CalculateDefaultCrop(size: Size, ratio: number = 0.8): Rect {
	const cropWidth = Math.floor(size.width * ratio);
	const cropHeight = Math.floor(size.height * ratio);
	const cropX = Math.floor((size.width - cropWidth) / 2);
	const cropY = Math.floor((size.height - cropHeight) / 2);
	return { x: cropX, y: cropY, width: cropWidth, height: cropHeight };
}

/**
 * 在 w*h 区域内，取比例为 r 的最大矩形
 * r = width / height
 */
export function MaxRectWithRatio(w: number, h: number, r: number): Size {
	if (w <= 0 || h <= 0 || r <= 0) {
		throw new Error("参数必须为正数")
	}

	const height = Math.min(h, w / r);
	const width = height * r;

	return { width: Math.round(width), height: Math.round(height) }
}

export function CalcRatio(w: number, h: number) {
	return w / h;
}

export function CalcWidthWidthRatio(h: number, r: number) {
	return Math.round(h * r);
}

export function CalcHeightWithRatio(w: number, r: number) {
	return Math.round(w / r);
}

export function Clamp(value: number, min: number, max: number): number {
    return Math.min(Math.max(value, min), max);
}

export function HasBucket(item: ImageItem) {
	return item.crops.find((v) => v.bucket != '') !== undefined;
}

export function HasUpscale(item: ImageItem, buckets: Map<string, Bucket>) {
	for (const crop of item.crops) {
		if (crop.bucket === "") continue;
		const bucket = buckets.get(crop.bucket);
		if (bucket) {
			if (bucket.width > crop.width || bucket.height > crop.height) {
				return true;
			}
		}
	}
	return false;
}