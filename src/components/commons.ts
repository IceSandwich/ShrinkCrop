export interface Size {
	width: number;
	height: number;
}

export interface Rect{
	x: number;
	y: number;
	width: number;
	height: number;
}

export interface Image {
	src: string;
	title: string;
	width: number;
	height: number;
	crop: Rect;
	bucket: number;
	resizeQuality: ImageSmoothingQuality;
}

export interface Bucket {
	size: Size;
	ratio: Size;
}

export interface ExportData {
	srcWidth: number,
	srcHeight: number,
	cropX: number,
	cropY: number,
	cropWidth: number,
	cropHeight: number,
	bucket: Bucket | null,
}

export function calculateAspectRatio(width: number, height: number): Size {
    // 计算最大公约数 (GCD)
    const gcd = function (a: number, b: number): number {
        return b === 0 ? a : gcd(b, a % b);
    }

    const greatestCommonDivisor = gcd(width, height);
    const aspectRatioWidth = width / greatestCommonDivisor;
    const aspectRatioHeight = height / greatestCommonDivisor;

    return {
		width: aspectRatioWidth,
		height: aspectRatioHeight
	}
}

export function calculateDefaultCrop(size: Size, ratio: number = 0.8): Rect {
	const cropWidth = Math.floor(size.width * ratio);
	const cropHeight = Math.floor(size.height * ratio);
	const cropX = Math.floor((size.width - cropWidth)/2);
	const cropY = Math.floor((size.height - cropHeight)/2);
	return { x: cropX, y: cropY, width: cropWidth, height: cropHeight };
}

export type ResponseType = 'base64' | 'blob';

/**
 * 实现ResizeAndCrop的逻辑，最后保证输出尺寸为`targetSize`
 */
export function applyImage(src: string, crop: Rect, targetSize: Size, resizeQuality: ImageSmoothingQuality, type: ResponseType) {
	const canvas = document.createElement('canvas');
	const ctx = canvas.getContext('2d');
	if (ctx == null) return null;
	ctx.imageSmoothingEnabled = true;         // 开启插值
    ctx.imageSmoothingQuality = resizeQuality;       // 设置高质量插值
	console.log("Apply", resizeQuality);

	const img = new Image();
	const promise = new Promise<string | Blob>((resolve, reject) => {
		img.onerror = function (e) {
			reject(e);
		}

		img.onload = function() {
			if (crop.width / crop.height > targetSize.width / targetSize.height) {
				crop.width = Math.ceil(targetSize.width * crop.height / targetSize.height);
			} else {
				crop.height = Math.ceil(targetSize.height * crop.width / targetSize.width);
			}

			console.log(`Crop ratio: ${crop.width} / ${crop.height} = ${crop.width / crop.height}, target ratio: ${targetSize.width} / ${targetSize.height} = ${targetSize.width / targetSize.height}`);

			canvas.width = targetSize.width;
			canvas.height = targetSize.height;
			ctx.drawImage(img, crop.x, crop.y, crop.width, crop.height, 0, 0, targetSize.width, targetSize.height);

			if (type === 'base64') {
				resolve(canvas.toDataURL());
			} else {
				canvas.toBlob((blob: Blob | null) => {
					if (blob == null) reject("null blob");
					else resolve(blob);
				});
			}
		}
	});
	img.src = src;
	return promise;
}

/**
 * 对base64图像或blob图像应用虚化蒙版
 */
export function sharpenImage(src: string | Blob, strength: number) {
	if (ctx == null) return null;

	const processBase64Img = function (base64src: string) {
		const img = new Image();
		img.onload = function() {
			
		}
		img.src = base64src;
	}

	if (typeof src === typeof Blob) {
		const reader = new FileReader();
		reader.onload = () => processBase64Img(reader.result as string);
		reader.readAsDataURL(src as Blob);
	} else {
		processBase64Img(src as string);
	}
}