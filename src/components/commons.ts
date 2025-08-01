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
	sharpnessRadius: number;
	sharpnessStrength: number;
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
	sharpnessRadius: number;
	sharpnessStrength: number;
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

/*
// Helper function to apply Gaussian Blur to the image (simplified)
function applyGaussianBlur(imageData: ImageData, radius: number) {
	const width = imageData.width, height = imageData.height;
	const kernelSize = 2 * radius + 1;
	const kernel = createGaussianKernel(radius);

	const output = new ImageData(width, height);
	const data = imageData.data;
	const resultData = output.data;

	// Apply the kernel to each pixel
	for (let y = 0; y < height; y++) {
		for (let x = 0; x < width; x++) {
			let r = 0, g = 0, b = 0, a = 0;
			for (let ky = -radius; ky <= radius; ky++) {
				for (let kx = -radius; kx <= radius; kx++) {
					const nx = x + kx;
					const ny = y + ky;
					if (nx >= 0 && ny >= 0 && nx < width && ny < height) {
						const weight = kernel[ky + radius][kx + radius];
						const idx = (ny * width + nx) * 4;
						r += data[idx] * weight;
						g += data[idx + 1] * weight;
						b += data[idx + 2] * weight;
						a += data[idx + 3] * weight;
					}
				}
			}
			const idx = (y * width + x) * 4;
			resultData[idx] = r;
			resultData[idx + 1] = g;
			resultData[idx + 2] = b;
			resultData[idx + 3] = a;
		}
	}

	return output;
}

// Helper function to create Gaussian kernel
function createGaussianKernel(radius: number) {
	const size = 2 * radius + 1;
	const kernel = Array(size).fill().map(() => Array(size).fill(0));

	const sigma = radius / 3;
	const twoSigma2 = 2 * sigma * sigma;
	const sigmaPi = Math.PI * twoSigma2;
	let sum = 0;

	for (let y = -radius; y <= radius; y++) {
		for (let x = -radius; x <= radius; x++) {
			const value = Math.exp(-(x * x + y * y) / twoSigma2) / sigmaPi;
			kernel[y + radius][x + radius] = value;
			sum += value;
		}
	}

	// Normalize the kernel
	for (let y = 0; y < size; y++) {
		for (let x = 0; x < size; x++) {
			kernel[y][x] /= sum;
		}
	}

	return kernel;
}

// Main function for Unsharp Masking
function unsharpMask(imageData: ImageData, radius: number, strength: number) {
	const blurredData = applyGaussianBlur(imageData, radius);
	const output = new ImageData(imageData.width, imageData.height);
	const data = imageData.data;
	const blurred = blurredData.data;
	const resultData = output.data;

	// Subtract the blurred image and add the mask back
	for (let i = 0; i < data.length; i += 4) {
		const diffR = data[i] - blurred[i];
		const diffG = data[i + 1] - blurred[i + 1];
		const diffB = data[i + 2] - blurred[i + 2];

		resultData[i] = Math.min(255, Math.max(0, data[i] + strength * diffR));
		resultData[i + 1] = Math.min(255, Math.max(0, data[i + 1] + strength * diffG));
		resultData[i + 2] = Math.min(255, Math.max(0, data[i + 2] + strength * diffB));
		resultData[i + 3] = data[i + 3]; // Keep alpha channel unchanged
	}

	return output;
}
*/

/**
 * 对base64图像或blob图像应用虚化蒙版
 */
export function sharpenImage(src: string, radius: number, strength: number) {
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

			ctx.clearRect(0, 0, canvas.width, canvas.height);

			// Apply a blur to the mask using a simple box blur or Gaussian blur approximation
			ctx.filter = `blur(${radius}px)`;
			ctx.drawImage(img, 0, 0);
			const blurred = ctx.getImageData(0, 0, img.width, img.height).data;

			// Subtract the blurred image and add the mask back
			for (let i = 0; i < data.length; i += 4) {
				const diffR = data[i] - blurred[i];
				const diffG = data[i + 1] - blurred[i + 1];
				const diffB = data[i + 2] - blurred[i + 2];

				data[i] = Math.min(255, Math.max(0, data[i] + strength * diffR));
				data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + strength * diffG));
				data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + strength * diffB));
				data[i + 3] = data[i + 3]; // Keep alpha channel unchanged
			}

            // Put the modified image data back onto the canvas
            ctx.putImageData(imageData, 0, 0);

			resolve(canvas.toDataURL());
		}
		img.src = src;
	});
	return promise;
}