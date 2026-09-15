"""
PDF / image preprocessing.

Pipeline:
  Validate type/size -> if scanned PDF, render pages to images ->
  OpenCV preprocessing (grayscale, denoise, threshold, deskew)

We first check whether a PDF already has a selectable text layer; if so we
skip OCR entirely for that page (much faster and more accurate than OCR).
"""
from __future__ import annotations

import os
from dataclasses import dataclass
from typing import List, Optional

import cv2
import fitz  # PyMuPDF
import numpy as np
from PIL import Image

ALLOWED_CONTENT_TYPES = {"application/pdf", "image/jpeg", "image/png", "image/jpg"}


@dataclass
class PageImage:
    page_number: int
    image: np.ndarray  # BGR, only set when OCR is needed
    native_text: Optional[str]  # text already extractable from PDF, if any


def validate_upload(content_type: str, size_bytes: int, max_mb: int) -> None:
    if content_type not in ALLOWED_CONTENT_TYPES:
        raise ValueError(f"Unsupported file type: {content_type}")
    if size_bytes > max_mb * 1024 * 1024:
        raise ValueError(f"File exceeds max size of {max_mb}MB")


def deskew(image: np.ndarray) -> np.ndarray:
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY) if image.ndim == 3 else image
    gray = cv2.bitwise_not(gray)
    coords = np.column_stack(np.where(gray > 0))
    if coords.shape[0] < 10:
        return image
    angle = cv2.minAreaRect(coords)[-1]
    if angle < -45:
        angle = -(90 + angle)
    else:
        angle = -angle
    if abs(angle) < 0.1:
        return image
    (h, w) = image.shape[:2]
    center = (w // 2, h // 2)
    M = cv2.getRotationMatrix2D(center, angle, 1.0)
    return cv2.warpAffine(image, M, (w, h), flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_REPLICATE)


def opencv_clean(image: np.ndarray) -> np.ndarray:
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    denoised = cv2.fastNlMeansDenoising(gray, h=10)
    thresh = cv2.adaptiveThreshold(
        denoised, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 31, 15
    )
    bgr = cv2.cvtColor(thresh, cv2.COLOR_GRAY2BGR)
    return deskew(bgr)


def load_pages(file_path: str, content_type: str) -> List[PageImage]:
    """Return one PageImage per page. If the PDF page already has a text
    layer, native_text is populated and `image` is left as a small stub
    (OCR will be skipped for that page)."""
    pages: List[PageImage] = []

    if content_type == "application/pdf":
        doc = fitz.open(file_path)
        try:
            for i, page in enumerate(doc):
                text = page.get_text("text").strip()
                if text:
                    pages.append(PageImage(page_number=i + 1, image=np.zeros((1, 1, 3), dtype=np.uint8), native_text=text))
                else:
                    pix = page.get_pixmap(matrix=fitz.Matrix(2, 2))
                    img = np.frombuffer(pix.samples, dtype=np.uint8).reshape(pix.height, pix.width, pix.n)
                    if pix.n == 4:
                        img = cv2.cvtColor(img, cv2.COLOR_RGBA2BGR)
                    else:
                        img = cv2.cvtColor(img, cv2.COLOR_RGB2BGR)
                    pages.append(PageImage(page_number=i + 1, image=opencv_clean(img), native_text=None))
        finally:
            doc.close()
    else:
        pil_img = Image.open(file_path).convert("RGB")
        img = cv2.cvtColor(np.array(pil_img), cv2.COLOR_RGB2BGR)
        pages.append(PageImage(page_number=1, image=opencv_clean(img), native_text=None))

    return pages
