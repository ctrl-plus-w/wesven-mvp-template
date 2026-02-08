import { type HttpHandler, HttpResponse, http } from 'msw';

const VERCEL_BLOB_BASE_URL = 'https://blob.vercel-storage.com';

export interface MockBlobUploadResponse {
  url: string;
  downloadUrl: string;
  pathname: string;
  contentType: string;
  contentDisposition: string;
}

export const createBlobUploadHandler = (
  onUpload?: (file: { pathname: string; contentType: string }) => void,
): HttpHandler =>
  http.put(`${VERCEL_BLOB_BASE_URL}/*`, async ({ request }) => {
    const url = new URL(request.url);
    const pathname = url.pathname.slice(1);
    const contentType = request.headers.get('content-type') ?? 'application/octet-stream';

    const mockUrl = `${VERCEL_BLOB_BASE_URL}/${pathname}`;

    onUpload?.({ pathname, contentType });

    const response: MockBlobUploadResponse = {
      url: mockUrl,
      downloadUrl: mockUrl,
      pathname,
      contentType,
      contentDisposition: `attachment; filename="${pathname.split('/').pop()}"`,
    };

    return HttpResponse.json(response);
  });

export const createBlobDeleteHandler = (onDelete?: (url: string) => void): HttpHandler =>
  http.delete(`${VERCEL_BLOB_BASE_URL}/*`, ({ request }) => {
    const url = new URL(request.url);

    onDelete?.(url.href);

    return new HttpResponse(null, { status: 204 });
  });

export const createBlobHeadHandler = (): HttpHandler =>
  http.head(`${VERCEL_BLOB_BASE_URL}/*`, ({ request }) => {
    const url = new URL(request.url);
    const pathname = url.pathname.slice(1);

    return new HttpResponse(null, {
      status: 200,
      headers: {
        'content-type': 'image/jpeg',
        'content-length': '1024',
        'x-vercel-blob-pathname': pathname,
      },
    });
  });

export const createBlobNotFoundHandler = (path: string): HttpHandler =>
  http.head(`${VERCEL_BLOB_BASE_URL}/${path}`, () => {
    return new HttpResponse(null, { status: 404 });
  });

export const blobStorageHandlers: HttpHandler[] = [
  createBlobUploadHandler(),
  createBlobDeleteHandler(),
  createBlobHeadHandler(),
];

export default blobStorageHandlers;
