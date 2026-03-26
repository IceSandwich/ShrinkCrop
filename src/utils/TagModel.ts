import * as ort from "onnxruntime-web/all";
import { ref, type Ref } from "vue";
import { column } from "vuetify/lib/components/VCalendar/modes/column.mjs";

export interface ModelTensorInfo {
    input_width: number;
    input_height: number;
    input_channel: number;
    output_classes: number;
    output_name: string;
}

export interface TagInfo {
    name: string;
    category: number;
}

export interface TagResult {
    name: string;
    prob: number;
}

export class TagModel {
    private tags: TagInfo[];
    private session: ort.InferenceSession;
    private io: ModelTensorInfo;
    constructor(session: ort.InferenceSession, tags: TagInfo[], io: ModelTensorInfo) {
        this.session = session;
        this.tags = tags;
        this.io = io;

        console.log(`Loaded ${this.tags.length} tags.`)
    }

    async InferTags(input: string | Float32Array | ort.Tensor, thresh = 0.3485) {
        const infer = await this.infer(input);
        return this.fetchTags(infer, thresh)
    }

    async infer(inputData: string | Float32Array | ort.Tensor): Promise<Float32Array> {
        let tensor: ort.Tensor | null = null;
        const shape = [1, this.io.input_height, this.io.input_width, 3];
        if (typeof inputData === "string") {
            const data = await this.NewTensorFromImageURL(inputData);
            tensor = new ort.Tensor('float32', data, shape);
        } else if (inputData instanceof Float32Array) {
            tensor = new ort.Tensor("float32", inputData, shape);
        } else {
            tensor = inputData;
        }

		let feeds = new Map<string, ort.Tensor>();
        feeds.set(this.session.inputNames[0], tensor);

		// let startTime = performance.now();
		const output = await this.session.run(Object.fromEntries(feeds.entries()));
		// let endTime = performance.now();
		// let duration = endTime - startTime;
		// console.log(`模型执行耗时: ${duration} 毫秒`);

		// console.log("Got: ", output);

        const outputTensor = output[this.io.output_name];
        // console.log("Output shape: ", outputTensor.size);

        const outputData = await outputTensor.getData(true);
        console.log("infer data: ", outputData);

		return (outputData) as Float32Array;
	}

    fetchTags(infer: Float32Array, thresh = 0.3485) {
        let result: TagResult[] = [];
        this.tags.forEach((value, idx) => {
            if (value.category == 9) return;
            if (infer[idx] < thresh) return;

            result.push({
                name: value.name.replace('_', ' '),
                prob: infer[idx],
            })
        })

		return result;
	}

    NewTensorFromImageURL(imageURL: string): Promise<Float32Array> {
        const img = new Image();
        const that = this;
        // 当图像加载完成时执行
        return new Promise((resolve, reject) => {
            img.onload = function () {
                // 动态创建 canvas 元素
                const cacheCanvas = document.createElement('canvas');
                const ctx = cacheCanvas.getContext('2d');
                if (ctx == null) {
                    reject("failed to get 2d context");
                    return;
                }

                // 设置 canvas 尺寸为图像的尺寸
                const imgWidth = img.width;
                const imgHeight = img.height;
                const targetWidth = that.io.input_width;
                const targetHeight = that.io.input_height;
                cacheCanvas.width = targetWidth;
                cacheCanvas.height = targetHeight;

                // 计算图像的宽高比
                const imgRatio = imgWidth / imgHeight;
                const targetRatio = targetWidth / targetHeight;

                let scaleWidth, scaleHeight, offsetX = 0, offsetY = 0;

                if (imgRatio > targetRatio) {
                    // 图像比目标宽，按宽度缩放，垂直居中
                    scaleWidth = targetWidth;
                    scaleHeight = targetWidth / imgRatio;
                    offsetY = (targetHeight - scaleHeight) / 2; // 上下填充
                } else {
                    // 图像比目标高，按高度缩放，水平居中
                    scaleHeight = targetHeight;
                    scaleWidth = targetHeight * imgRatio;
                    offsetX = (targetWidth - scaleWidth) / 2; // 左右填充
                }

                // 填充背景色（白色）
                ctx.fillStyle = 'white';
                ctx.fillRect(0, 0, targetWidth, targetHeight);

                // 将图像绘制到 canvas 上，并根据计算好的缩放和偏移来确保 letterbox
                ctx.drawImage(img, 0, 0, imgWidth, imgHeight, offsetX, offsetY, scaleWidth, scaleHeight);

                // 获取图像的像素数据
                const imageData = ctx.getImageData(0, 0, targetWidth, targetHeight);

                // 获取像素数据的数组 (每个像素有4个值：R, G, B, A)
                const data = imageData.data;

                // 创建一个 Float32Array 来存储 RGB 数据
                const floatArray = new Float32Array(targetWidth * targetHeight * 3); // 每个像素3个值 (R, G, B)

                // 遍历像素数据并转换为 float 类型的 RGB 数据
                let index = 0;
                for (let i = 0; i < data.length; i += 4) {
                    const r = data[i];
                    const g = data[i + 1];
                    const b = data[i + 2];

                    // 将 BGR 值存储到 Float32Array 中
                    floatArray[index++] = b;
                    floatArray[index++] = g;
                    floatArray[index++] = r;
                }

                // 输出 Float32Array 内容
                // console.log(floatArray);
                resolve(floatArray);
            };
            img.src = imageURL;
        });
	}

    NewEmptyTensor() {
        return new Float32Array(this.io.input_channel * this.io.input_height * this.io.input_width);
    }
}

export let TagModelInstance = ref<TagModel | null>(null);

function preprocessTagContent(tagContent: string): TagInfo[] {
    // 按行拆分
    const lines = tagContent.split(/\r?\n/);

    // 去掉表头
    const dataLines = lines.slice(1);

    // 处理数据
    const fliteredData = dataLines
        .map(line => line.split(',')) // 拆分列
        .filter(columns => columns.length >= 3) // 确保至少有3列
        // .filter(columns => columns[2] === '0') // category 0
        .map(columns => {
            return {
                name: columns[1].trim(),
                category: parseInt(columns[2]),
            }
        });
    return fliteredData;
}

export async function CreateTagModel(model: Uint8Array, tagContent: string, io: ModelTensorInfo) {
    ort.env.wasm.wasmPaths = 'https://unpkg.com/onnxruntime-web@dev/dist/';
    const modelPromise = ort.InferenceSession.create(model, {
        executionProviders: [{
            name: "webgpu",
            preferredLayout: "NHWC"
        }, {
            name: "webgl", 
        }, {
            name: "wasm",
        }],
        graphOptimizationLevel: "all",
    });
    const taglistPromise = new Promise<TagInfo[]>((resolve, reject) => {
        resolve(preprocessTagContent(tagContent));
    });
    const vaules = await Promise.all([modelPromise, taglistPromise]);
    readSavedCategory();
    return new TagModel(vaules[0], vaules[1], io);
}

export interface TagItem {
    name: string;
}

export interface CategoryTags {
    name: string;
    tags: TagItem[];
}

export interface SavedCategory {
    categories: CategoryTags[];
    unwanted: TagItem[];
}

export let SavedCategoryInstance = ref<SavedCategory | null>(null);

function readSavedCategory() {
    const data = localStorage.getItem('tagConfig')
    if (data) {
        const parsed: SavedCategory = JSON.parse(data)
        SavedCategoryInstance.value = parsed
    } else {
        UpdateSavedCategory({
            categories: [],
            unwanted: [],
        })
    }
}

export function GetSavedCategoryCopy() {
    if (SavedCategoryInstance.value == null) {
        return null;
    }
    return JSON.parse(JSON.stringify(SavedCategoryInstance.value));
}

export function UpdateSavedCategory(newCategory: SavedCategory) {
    SavedCategoryInstance.value = JSON.parse(JSON.stringify(newCategory));
    console.log(SavedCategoryInstance, newCategory);
    localStorage.setItem('tagConfig', JSON.stringify(SavedCategoryInstance.value));
}

export let TagPool = ref<string[]>([]);
