export interface Size {
	width: number;
	height: number;
}

export interface Rect extends Size {
	x: number;
	y: number;
}

export interface CropRect extends Rect {
	bucket: string;
}

export interface Bucket {
	width: number;
	height: number;
	ratio: number;
}

export interface ImageItem {
	imgurl: string;
	filename: string;
	width: number;
	height: number;
	crops: CropRect[];
	cachedHasCrop: boolean,
	cachedHasUpscale: boolean,
}


export interface ProjectMetadata {
	version: number;
}

export interface ProjectImageData {
	crops: CropRect[];
}

export interface Project {
	metadata: ProjectMetadata;
	files: { [key: string]: ProjectImageData };
	buckets: { [key: string]: Bucket };
}