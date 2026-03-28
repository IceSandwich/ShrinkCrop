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

export interface CropRectWithTags extends CropRect {
	srcTags: string[];
	selectedTags: string[];
}

export interface Bucket {
	width: number;
	height: number;
	ratio: number;
}

export interface ProjectImageData {
	// record source path may be the data will be used in other programs
	// we use md5 to match 2 images instead of filename
	filename: string;

	md5: string;
	crops: CropRectWithTags[];
}

export interface ImageItem extends ProjectImageData{
	filename: string;
	width: number;
	height: number;
	imgurl: string;
	cachedHasCrop: boolean;
	cachedHasUpscale: boolean;
}


export interface ProjectMetadata {
	version: number;
}


export interface Project {
	metadata: ProjectMetadata;
	files: ProjectImageData[];
	buckets: { [key: string]: Bucket };
}
