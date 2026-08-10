export class JsonExporter {
  static export({ result, filename = null }) {
    if (!result) {
      console.warn('[JsonExporter] no result provided');
      return;
    }

    const json = JSON.stringify(result, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const finalFilename = filename || `marbledrop-level-${result.levelId}-${Date.now()}.json`;

    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = finalFilename;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);

    URL.revokeObjectURL(url);
  }
}
