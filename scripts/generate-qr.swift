import AppKit
import CoreImage
import Foundation

guard CommandLine.arguments.count == 3 else {
    fputs("Usage: swift generate-qr.swift <url> <output.png>\n", stderr)
    exit(1)
}

let url = CommandLine.arguments[1]
let outputPath = CommandLine.arguments[2]

guard let message = url.data(using: .utf8),
      let filter = CIFilter(name: "CIQRCodeGenerator") else {
    fputs("Could not initialize QR generator.\n", stderr)
    exit(1)
}

filter.setValue(message, forKey: "inputMessage")
filter.setValue("H", forKey: "inputCorrectionLevel")

guard let qrImage = filter.outputImage else {
    fputs("Could not generate QR image.\n", stderr)
    exit(1)
}

let moduleScale: CGFloat = 24
let quietZoneModules: CGFloat = 4
let scaledQR = qrImage.transformed(by: CGAffineTransform(scaleX: moduleScale, y: moduleScale))
let padding = quietZoneModules * moduleScale
let canvasRect = CGRect(
    x: 0,
    y: 0,
    width: scaledQR.extent.width + (padding * 2),
    height: scaledQR.extent.height + (padding * 2)
)
let whiteCanvas = CIImage(color: CIColor.white).cropped(to: canvasRect)
let positionedQR = scaledQR.transformed(by: CGAffineTransform(translationX: padding, y: padding))
let finalImage = positionedQR.composited(over: whiteCanvas).cropped(to: canvasRect)

let context = CIContext(options: [.useSoftwareRenderer: true])
let imageRep = NSCIImageRep(ciImage: finalImage)
let image = NSImage(size: canvasRect.size)
image.addRepresentation(imageRep)

guard let tiffData = image.tiffRepresentation,
      let bitmap = NSBitmapImageRep(data: tiffData) else {
    fputs("Could not render QR image.\n", stderr)
    exit(1)
}

guard let pngData = bitmap.representation(using: .png, properties: [:]) else {
    fputs("Could not encode QR image as PNG.\n", stderr)
    exit(1)
}

let outputURL = URL(fileURLWithPath: outputPath)
try FileManager.default.createDirectory(
    at: outputURL.deletingLastPathComponent(),
    withIntermediateDirectories: true
)
try pngData.write(to: outputURL)

let detector = CIDetector(
    ofType: CIDetectorTypeQRCode,
    context: context,
    options: [CIDetectorAccuracy: CIDetectorAccuracyHigh]
)
let decodedURL = detector?
    .features(in: finalImage)
    .compactMap { ($0 as? CIQRCodeFeature)?.messageString }
    .first

guard decodedURL == url else {
    fputs("Generated QR validation failed.\n", stderr)
    exit(1)
}

print("Generated and validated \(outputPath) → \(url)")
