"""
Weaviate client wrapper. This tries to connect to a local or cloud Weaviate instance.
If connection fails, the module falls back to a simple in-memory mock for development/testing.
"""
import logging
from typing import List, Dict, Optional
from config import config

logger = logging.getLogger(__name__)

try:
    import weaviate
    from weaviate.classes.config import Configure, Property, DataType
    HAS_WEAVIATE = True
except Exception:
    HAS_WEAVIATE = False
    logger.warning("weaviate client not available; running in mock mode")


class _MockCollection:
    def __init__(self):
        self.objects = []

    def insert(self, doc):
        uuid = f"mock-{len(self.objects)+1}"
        self.objects.append({"uuid": uuid, "properties": doc})
        return uuid

    def query_near_text(self, query, limit=3, where=None):
        # naive match
        results = []
        for o in self.objects:
            if where and where.get('valueText') and where.get('path'):
                if o['properties'].get(where['path'][0]) == where['valueText']:
                    results.append(o)
        return results


class WeaviateClient:
    def __init__(self):
        self.client = None
        if HAS_WEAVIATE:
            self.connect()
            try:
                self.setup_schema()
            except Exception:
                logger.exception("Failed to setup schema")
        else:
            # mock collections
            self.collections = {'Prescription': _MockCollection(), 'Patient': _MockCollection()}

    def connect(self):
        try:
            if config.WEAVIATE_API_KEY:
                # cloud connect
                self.client = weaviate.connect_to_weaviate_cloud(
                    cluster_url=config.WEAVIATE_URL,
                    auth_credentials=weaviate.auth.AuthApiKey(config.WEAVIATE_API_KEY)
                )
            else:
                host = config.WEAVIATE_URL.replace('http://', '').replace('https://', '')
                self.client = weaviate.connect_to_local(host=host)
            logger.info("Connected to Weaviate")
        except Exception:
            logger.exception("Failed to connect to Weaviate; falling back to mock")
            self.client = None
            self.collections = {'Prescription': _MockCollection(), 'Patient': _MockCollection()}

    def setup_schema(self):
        if not self.client:
            return
        # try to create collections; this depends on weaviate client API
        # For simplicity, keep this minimal and resilient
        logger.info("Weaviate schema setup (no-op in MVP)")

    def add_prescription(self, prescription_data: Dict) -> str:
        if HAS_WEAVIATE and self.client:
            try:
                collection = self.client.collections.get('Prescription')
                uid = collection.data.insert(prescription_data)
                return str(uid)
            except Exception:
                logger.exception('weaviate add_prescription failed')
        # mock insert
        return self.collections['Prescription'].insert(prescription_data)

    def search_prescriptions(self, query: str, patient_id: str, limit: int = 3) -> List[Dict]:
        if HAS_WEAVIATE and self.client:
            try:
                collection = self.client.collections.get('Prescription')
                response = collection.query.near_text(query=query, limit=limit, where={
                    'path': ['patient_id'], 'operator': 'Equal', 'valueText': patient_id
                })
                # expected response processing
                return [{'uuid': str(getattr(obj, 'uuid', '')), 'properties': getattr(obj, 'properties', {})} for obj in response.objects]
            except Exception:
                logger.exception('weaviate search failed')
                return []
        # mock search: return objects with matching patient_id
        results = []
        for o in self.collections['Prescription'].objects:
            if o['properties'].get('patient_id') == patient_id:
                results.append({'uuid': o['uuid'], 'properties': o['properties']})
        return results[:limit]

    def get_patient(self, phone_number: str) -> Optional[Dict]:
        if HAS_WEAVIATE and self.client:
            try:
                collection = self.client.collections.get('Patient')
                response = collection.query.fetch_objects(where={'path': ['phone_number'], 'operator': 'Equal', 'valueText': phone_number}, limit=1)
                if response.objects:
                    obj = response.objects[0]
                    return {'uuid': str(obj.uuid), **obj.properties}
                return None
            except Exception:
                logger.exception('weaviate get_patient failed')
                return None
        # mock lookup
        for o in self.collections['Patient'].objects:
            if o['properties'].get('phone_number') == phone_number:
                return {'uuid': o['uuid'], **o['properties']}
        return None

    def upsert_patient(self, patient_data: Dict, phone_number: str) -> str:
        existing = self.get_patient(phone_number)
        if HAS_WEAVIATE and self.client:
            try:
                collection = self.client.collections.get('Patient')
                if existing:
                    collection.data.update(uuid=existing['uuid'], properties=patient_data)
                    return existing['uuid']
                else:
                    uid = collection.data.insert(patient_data)
                    return str(uid)
            except Exception:
                logger.exception('weaviate upsert failed')
        # mock upsert
        if existing:
            # replace
            for idx, o in enumerate(self.collections['Patient'].objects):
                if o['uuid'] == existing['uuid']:
                    self.collections['Patient'].objects[idx] = {'uuid': existing['uuid'], 'properties': patient_data}
                    return existing['uuid']
        return self.collections['Patient'].insert(patient_data)

    def close(self):
        if HAS_WEAVIATE and self.client:
            try:
                self.client.close()
            except Exception:
                pass


weaviate_client = WeaviateClient()
