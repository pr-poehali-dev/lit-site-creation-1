import json
import os
import base64
import uuid
import boto3

def cors_headers():
    return {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, X-Auth-Token',
    }

def handler(event: dict, context) -> dict:
    """Загрузка иллюстрации в S3. Принимает base64-изображение, возвращает CDN-ссылку."""
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': cors_headers(), 'body': ''}

    headers = {k.lower(): v for k, v in (event.get('headers') or {}).items()}
    token = headers.get('x-auth-token', '')
    if token != os.environ.get('ADMIN_PASSWORD', ''):
        return {'statusCode': 401, 'headers': cors_headers(), 'body': json.dumps({'error': 'Нет доступа'})}

    body = json.loads(event.get('body') or '{}')
    data_url = body.get('file', '')
    if not data_url:
        return {'statusCode': 400, 'headers': cors_headers(), 'body': json.dumps({'error': 'Файл не передан'})}

    # Парсим data:image/jpeg;base64,....
    if ',' in data_url:
        header, encoded = data_url.split(',', 1)
        ext = 'jpg'
        if 'png' in header:
            ext = 'png'
        elif 'gif' in header:
            ext = 'gif'
        elif 'webp' in header:
            ext = 'webp'
    else:
        encoded = data_url
        ext = 'jpg'

    file_data = base64.b64decode(encoded)
    key = f'illustrations/{uuid.uuid4()}.{ext}'
    content_type = f'image/{ext}' if ext != 'jpg' else 'image/jpeg'

    s3 = boto3.client(
        's3',
        endpoint_url='https://bucket.poehali.dev',
        aws_access_key_id=os.environ['AWS_ACCESS_KEY_ID'],
        aws_secret_access_key=os.environ['AWS_SECRET_ACCESS_KEY'],
    )
    s3.put_object(Bucket='files', Key=key, Body=file_data, ContentType=content_type)

    cdn_url = f"https://cdn.poehali.dev/projects/{os.environ['AWS_ACCESS_KEY_ID']}/bucket/{key}"
    return {'statusCode': 200, 'headers': cors_headers(), 'body': json.dumps({'url': cdn_url})}
