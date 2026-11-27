import { toString as qrToString } from "qrcode";

export function qrSvgForUrl(url: string): Promise<string> {
  return qrToString(url, {
    type: "svg",
    errorCorrectionLevel: "M",
    margin: 0,
  });
}
