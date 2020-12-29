import boto3

bucket = "bioimage-search-input"
key = "testlist.txt"

list = []
list.append("hello1")
list.append("hello2")
list.append("hello3")

l2 = "\n".join(list)

print(l2)

s2 = bytes(l2, encoding='utf-8')
s3c = boto3.client('s3')
s3c.put_object(Body=s2, Bucket=bucket, Key=key)
