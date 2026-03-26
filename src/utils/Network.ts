export async function DownloadFileWithProgress(
    url: string,
    onProgress?: (loaded: number, total: number) => void
): Promise<Uint8Array> {
    const response = await fetch(url);
    if (!response.ok || !response.body) {
        throw new Error(`下载失败: ${response.status} ${response.statusText}`);
    }

    const contentLength = response.headers.get('Content-Length');
    const total = contentLength ? parseInt(contentLength, 10) : 0;

    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let loaded = 0;

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        if (value) {
            chunks.push(value);
            loaded += value.length;
            if (onProgress && total) {
                onProgress(loaded, total); // 回调进度
            }
        }
    }

    // 合并所有块
    const arrayBuffer = new Uint8Array(loaded);
    let position = 0;
    for (const chunk of chunks) {
        arrayBuffer.set(chunk, position);
        position += chunk.length;
    }

    return arrayBuffer;
}

export function InvokeUserDownloadFile(name: string, file: Blob) {
	const link = document.createElement("a");
	link.href = URL.createObjectURL(file);
	link.download = name;
	link.click();
}

export async function DownloadTextFile(url: string) {
    const response = await fetch(url);
    if (!response.ok) {
    throw new Error(`Failed to fetch file from ${url}. Status code ${response.status} ${response.statusText}`);
  }
  const content = await response.text();
  return content;
}
