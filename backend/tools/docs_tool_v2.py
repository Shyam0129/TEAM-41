"""
Docs Tool V2 - Uses Google OAuth credentials directly (multi-user).
"""

from googleapiclient.discovery import build
from google.oauth2.credentials import Credentials
import logging

logger = logging.getLogger(__name__)


class DocsToolV2:
    """Docs tool that uses Google OAuth credentials directly"""
    
    def __init__(self, credentials: Credentials):
        """Initialize Docs tool with Google credentials"""
        self.credentials = credentials
        self.docs_service = None
        self.drive_service = None
    
    def _get_docs_service(self):
        """Get or create Docs API service"""
        if not self.docs_service:
            self.docs_service = build('docs', 'v1', credentials=self.credentials)
        return self.docs_service
    
    def _get_drive_service(self):
        """Get or create Drive API service"""
        if not self.drive_service:
            self.drive_service = build('drive', 'v3', credentials=self.credentials)
        return self.drive_service
    
    def create_document(self, title: str, content: str = None):
        """
        Create a new Google Doc.
        
        Args:
            title: Document title
            content: Initial content (optional)
            
        Returns:
            Created document object
        """
        try:
            docs_service = self._get_docs_service()
            
            # Create document
            doc = docs_service.documents().create(body={'title': title}).execute()
            doc_id = doc.get('documentId')
            
            logger.info(f"Document created: {doc_id}")
            
            # Add content if provided
            if content:
                requests = [{
                    'insertText': {
                        'location': {'index': 1},
                        'text': content
                    }
                }]
                
                docs_service.documents().batchUpdate(
                    documentId=doc_id,
                    body={'requests': requests}
                ).execute()
                
                logger.info(f"Content added to document: {doc_id}")
            
            return doc
            
        except Exception as e:
            logger.error(f"Failed to create document: {e}")
            raise
    
    def get_document(self, document_id: str):
        """Get a document by ID"""
        try:
            docs_service = self._get_docs_service()
            doc = docs_service.documents().get(documentId=document_id).execute()
            return doc
            
        except Exception as e:
            logger.error(f"Failed to get document: {e}")
            raise
    
    def update_document(self, document_id: str, content: str):
        """Update document content"""
        try:
            docs_service = self._get_docs_service()
            
            requests = [{
                'insertText': {
                    'location': {'index': 1},
                    'text': content
                }
            }]
            
            result = docs_service.documents().batchUpdate(
                documentId=document_id,
                body={'requests': requests}
            ).execute()
            
            logger.info(f"Document updated: {document_id}")
            return result
            
        except Exception as e:
            logger.error(f"Failed to update document: {e}")
            raise
    
    def list_documents(self, max_results: int = 10):
        """List user's documents"""
        try:
            drive_service = self._get_drive_service()
            
            results = drive_service.files().list(
                q="mimeType='application/vnd.google-apps.document'",
                pageSize=max_results,
                fields="files(id, name, createdTime, modifiedTime)"
            ).execute()
            
            return results.get('files', [])
            
        except Exception as e:
            logger.error(f"Failed to list documents: {e}")
            raise
