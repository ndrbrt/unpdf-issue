import {
  getDocumentProxy,
  extractText,
  getMeta,
  renderPageAsImage,
} from "unpdf";

/**
 * Extract text, metadata and thumbnail from a PDF
 */
export default eventHandler(async (event) => {
  // Get the otpions
  const rawOptions = getQuery(event);
  const options = {
    text: rawOptions.text !== "false",
    thumbnail: rawOptions.thumbnail !== "false",
    url: rawOptions.url as string,
  };

  // Fetch PDF from signed URL
  const buffer = await fetch(options.url).then((res) => res.arrayBuffer());

  // Define tasks to run
  const tasks = [];
  if (options.thumbnail) {
    // Create thumbnail
    const bufferCopy = buffer.slice(0);
    tasks.push(
      (async () => {
        const pageNumber = 1;
        const scale = 2;
        await renderPageAsImage(new Uint8Array(bufferCopy), pageNumber, {
          canvas: () => import("canvas"),
          scale,
        });
        return {
          thumbnail: {
            success: "true",
            pageNumber,
            scale,
          },
        };
      })()
    );
  }
  if (options.text) {
    // // Load PDF from buffer
    const pdf = await getDocumentProxy(new Uint8Array(buffer));
    // Extract text
    tasks.push(
      (async () => {
        const { text, totalPages } = await extractText(pdf, {
          mergePages: true,
        });
        return { text: { text: text.substring(0, 100), totalPages } };
      })()
    );
    // Get metadata
    tasks.push(
      (async () => {
        const { info, metadata } = await getMeta(pdf);
        return { metadata: { info, metadata } };
      })()
    );
  }

  const results = await Promise.all(tasks);
  return results;
});
