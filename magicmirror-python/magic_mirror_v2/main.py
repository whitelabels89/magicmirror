from pydrive.auth import GoogleAuth
from pydrive.drive import GoogleDrive
import os
from dotenv import load_dotenv
load_dotenv()

def upload_file(local_path, remote_filename=None, folder_id=None):
    """
    Upload a file to Google Drive. Requires PyDrive and prior authentication setup.
    
    Args:
        local_path (str): Local file path to upload.
        remote_filename (str, optional): Name to use in Drive. Defaults to same as local file.
        folder_id (str, optional): Folder ID in Google Drive. If not set, uploads to root.

    Returns:
        str: Shareable Google Drive URL of uploaded file.
    """
    gauth = GoogleAuth()
    gauth.LocalWebserverAuth()
    drive = GoogleDrive(gauth)

    if not os.path.exists(local_path):
        raise FileNotFoundError(f"File not found: {local_path}")

    file_drive = drive.CreateFile({
        'title': remote_filename or os.path.basename(local_path),
        'parents': [{'id': folder_id}] if folder_id else []
    })
    file_drive.SetContentFile(local_path)
    file_drive.Upload()

    file_drive.InsertPermission({
        'type': 'anyone',
        'value': 'anyone',
        'role': 'reader'
    })

    return f"https://drive.google.com/uc?id={file_drive['id']}"
