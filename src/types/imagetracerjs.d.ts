declare module 'imagetracerjs' {
    const ImageTracer: {
        imageToSVG: (
            source: string,
            callback: (svgstr: string) => void,
            options?: any
        ) => void;
        imagedataToSVG: (
            imageData: ImageData,
            options?: any
        ) => string;
        appendSVGString: (svgstr: string, parentid: string) => void;
    };
    export default ImageTracer;
}
