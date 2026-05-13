import { google } from "googleapis";

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
    scopes: [
      "https://www.googleapis.com/auth/drive",
      "https://www.googleapis.com/auth/documents",
    ],
  });
}

function textToRequests(content: string) {
  const requests: Array<Record<string, unknown>> = [];
  let idx = 1;

  const lines = content.split("\n");
  for (const line of lines) {
    const trimmed = line.trimStart();

    if (trimmed.startsWith("# ")) {
      const text = trimmed.slice(2) + "\n";
      requests.push(
        { insertText: { location: { index: idx }, text } },
        {
          updateParagraphStyle: {
            range: { startIndex: idx, endIndex: idx + text.length },
            paragraphStyle: { namedStyleType: "HEADING_1" },
            fields: "namedStyleType",
          },
        },
      );
      idx += text.length;
    } else if (trimmed.startsWith("## ")) {
      const text = trimmed.slice(3) + "\n";
      requests.push(
        { insertText: { location: { index: idx }, text } },
        {
          updateParagraphStyle: {
            range: { startIndex: idx, endIndex: idx + text.length },
            paragraphStyle: { namedStyleType: "HEADING_2" },
            fields: "namedStyleType",
          },
        },
      );
      idx += text.length;
    } else {
      const text = line + "\n";
      requests.push({ insertText: { location: { index: idx }, text } });
      idx += text.length;
    }
  }

  return requests;
}

export async function createGoogleDoc(
  opts: CreateDocOptions,
): Promise<CreateDocResult> {
  const auth = getAuth(opts.serviceAccountJson);
  const docs = google.docs({ version: "v1", auth });
  const drive = google.drive({ version: "v3", auth });

  const doc = await docs.documents.create({
    requestBody: { title: opts.title },
  });

  const fileId = doc.data.documentId!;

  const requests = textToRequests(opts.content);
  if (requests.length > 0) {
    await docs.documents.batchUpdate({
      documentId: fileId,
      requestBody: { requests },
    });
  }

  await drive.files.update({
    fileId,
    addParents: opts.folderId,
    fields: "id,webViewLink",
  });

  const file = await drive.files.get({
    fileId,
    fields: "webViewLink",
  });

  return {
    fileId,
    webViewLink: file.data.webViewLink ?? `https://docs.google.com/document/d/${fileId}/edit`,
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
    });

    if (folder.data.mimeType !== "application/vnd.google-apps.folder") {
      return { ok: false, error: "ID does not point to a folder" };
    }

    return { ok: true, folderName: folder.data.name ?? undefined };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("404") || msg.includes("notFound")) {
      return { ok: false, error: "Folder not found or service account lacks access" };
    }
    if (msg.includes("401") || msg.includes("403")) {
      return { ok: false, error: "Invalid service account credentials" };
    }
    return { ok: false, error: `Connection failed: ${msg.slice(0, 200)}` };
  }
}
