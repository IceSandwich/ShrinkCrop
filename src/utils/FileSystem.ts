import JSZip from "jszip";

/**
 * 打开文件选择对话框
 * @param filetype MIME类型，比如"image/*"
 * @param multiple 是否可以多选
 * @param callback 当选中文件的回调
 */
export function OpenFileDialog(filetype: string, multiple: boolean, callback: (filelist: File[]) => void) {
	// 创建隐藏的文件输入元素
	const fileInput = document.createElement('input');
	fileInput.type = 'file';
	fileInput.className = 'hidden';
	fileInput.multiple = multiple;
	fileInput.accept = filetype;

	// 添加到页面中
	// document.body.appendChild(fileInput);

	// 绑定change事件
	fileInput.addEventListener('change', function (e: Event) {
		const files = Array.from((e.target as HTMLInputElement).files!);
		if (files.length == 0) return;
		callback(files);
	});

	// 触发点击事件
	fileInput.click();
	// document.body.removeChild(fileInput);
}

export interface ImageInstance {
	url: string;
	filename: string;
	img: HTMLImageElement;
}

export function ReadAsImage(file: File) : Promise<ImageInstance> {
	return new Promise(function (resolve, reject) {
		const reader = new FileReader();
		reader.onload = function(e) {
			if (!e.target || !e.target.result) {
				reject("FileReader return null");
				return;
			}

			const blobData = e.target?.result as ArrayBuffer;
			const blob = new Blob([new Uint8Array(blobData)], {type: file.type});
			const blobUrl = URL.createObjectURL(blob);

			const img = new Image();
			img.onload = function () {
				resolve({
					url: blobUrl,
					filename: file.name,
					img: img
				})
			};
			img.onerror = function (e) {
				reject(e);
			}
			img.src = blobUrl;
		};
		reader.onerror = function (e) {
			reject(e);
		};
		reader.readAsArrayBuffer(file);
	});
}

export function ReadAsJson<T>(file: File) : Promise<T> {
	return new Promise(function (resolve, reject) {
		const reader = new FileReader();
		reader.onload = function (e) {
			const data: T = JSON.parse(reader.result as string);
			resolve(data);
		};
		reader.onerror = function (e) {
			reject(e);
		};
		reader.readAsText(file);
	});
}

export function PackAsZIP(files: Map<string, Blob | string>) {
	const zip = new JSZip();
	for (const [key, value] of files) {
		zip.file(key, value);
	}
	return zip.generateAsync({type: "blob"});
}

export function DownloadFile(name: string, file: Blob) {
	const link = document.createElement("a");
	link.href = URL.createObjectURL(file);
	link.download = name;
	link.click();
}