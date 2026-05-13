import { google } from "googleapis";
import { Readable } from "stream";

interface CreateDocOptions {
  title: string;
  content: string;
  folderId: string;
  serviceAccountJson: string;
}

interface CreateDocResult {
  fileId: string;
  webViewLink: string;
}

interface TestConnectionResult {
  ok: boolean;
  folderName?: string;
  error?: string;
}

function getAuth(serviceAccountJson: string) {
  const credentials = JSON.parse(serviceAccountJson);
  return new google.auth.GoogleAuth({
    credentials,
    scopes: ["https://www.googleapis.com/auth/drive"],
  });
}

export async function createGoogleDoc(
  opts: CreateDocOptions,
): Promise<CreateDocResult> {
  const auth = getAuth(opts.serviceAccountJson);
  const drive = google.drive({ version: "v3", auth });

  const stream = new Readable();
  stream.push(opts.content);
  stream.push(null);

  const file = await drive.files.create({
    requestBody: {
      name: opts.title,
      mimeType: "application/vnd.google-apps.document",
      parents: [opts.folderId],
    },
    media: {
      mimeType: "text/plain",
      body: stream,
    },
    fields: "id,webViewLink",
    supportsAllDrives: true,
  });

  return {
    fileId: file.data.id!,
    webViewLink:
      file.data.webViewLink ??
      `https://docs.google.com/document/d/${file.data.id}/edit`,
  };
}

export async function testDriveConnection(
  serviceAccountJson: string,
  folderId: string,
): Promise<TestConnectionResult> {
  try {
    const auth = getAuth(serviceAccountJson);
    const drive = google.drive({ version: "v3", auth });

    const folder = await drive.files.get({
      fileId: folderId,
      fields: "id,name,mimeType",
      supportsAllDrives: true,
    });

    const mime = folder.data.mimeType;
    if (
      mime !== "application/vnd.google-apps.folder" &&
      mime !== "application/vnd.google-apps.shortcut"
    ) {
      return { ok: false, error: "ID does not point to a folder or shared drive" };
    }

    return { ok: true, folderName: folder.data.name ?? undefined };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("404") || msg.includes("notFound")) {
      return { ok: false, error: "Folder not found or service account lacks access" };
    }
    if (msg.includes("storage quota")) {
      return { ok: false, error: "Use a Shared Drive — service accounts cannot create files in personal folders" };
    }
    if (msg.includes("401") || msg.includes("403")) {
      return { ok: false, error: "Permission denied — check service account has Content Manager access" };
    }
    return { ok: false, error: `Connection failed: ${msg.slice(0, 200)}` };
  }
}
