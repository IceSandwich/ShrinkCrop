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
	sharpness: number;
}

export interface Bucket {
	size: Size;
	ratio: Size;
}

export interface ExportDataV1 {
	srcWidth: number,
	srcHeight: number,
	cropX: number,
	cropY: number,
	cropWidth: number,
	cropHeight: number,
	bucket: Bucket | null,
}

export interface ExportDataV2 extends ExportDataV1 {
	resizeQuality: ImageSmoothingQuality;
	sharpness: number;
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
export function sharpenImage(src: string, strength: number) {
	const canvas = document.createElement('canvas');
	const ctx = canvas.getContext('2d');
	const img = new Image();

	const promise = new Promise((resolve, reject) => {
		if (ctx == null) {
			reject("null ctx");
			return;
		}

		img.onload = () => {
			canvas.width = img.width;
			canvas.height = img.height;
			ctx.filter = '';
			ctx.drawImage(img, 0, 0);
			const imageData = ctx.getImageData(0, 0, img.width, img.height);
			const data = imageData.data;

			// Apply a blur to the mask using a simple box blur or Gaussian blur approximation
			ctx.filter = `blur(${strength}px)`;
			ctx.drawImage(img, 0, 0);
			const maskData = ctx.getImageData(0, 0, img.width, img.height).data;

			// Apply the soft light blending (here a simple approximation)
			for (let i = 0; i < data.length; i += 4) {
                // Get the color values for original image and blurred mask
                const r = data[i];     // Original Red
                const g = data[i + 1]; // Original Green
                const b = data[i + 2]; // Original Blue

                const mr = maskData[i];     // Mask Red
                const mg = maskData[i + 1]; // Mask Green
                const mb = maskData[i + 2]; // Mask Blue

                // Simple soft light blending
                const sr = r * (1 - mr / 255) + mr;
                const sg = g * (1 - mg / 255) + mg;
                const sb = b * (1 - mb / 255) + mb;

                // Apply the resulting color to the image data
                data[i] = Math.min(255, sr);
                data[i + 1] = Math.min(255, sg);
                data[i + 2] = Math.min(255, sb);
            }

            // Put the modified image data back onto the canvas
            ctx.putImageData(imageData, 0, 0);

			resolve(canvas.toDataURL());
		}
		img.src = src;
	});
	return promise;
}