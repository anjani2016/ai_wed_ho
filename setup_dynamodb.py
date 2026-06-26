#!/usr/bin/env python3
"""
setup_dynamodb.py — Create the weld-inspections DynamoDB table.

Run once before first deployment:
  python setup_dynamodb.py

Requires AWS CLI configured:
  aws configure   (or set AWS_ACCESS_KEY_ID + AWS_SECRET_ACCESS_KEY env vars)
"""

import boto3
import os
import sys
from botocore.exceptions import ClientError

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

TABLE_NAME = os.getenv("DYNAMODB_TABLE_NAME", "weld-inspections")
AWS_REGION = os.getenv("AWS_REGION", "us-east-1")


def create_table():
    session = boto3.Session(region_name=AWS_REGION)
    dynamodb = session.client("dynamodb")

    print(f"Creating DynamoDB table '{TABLE_NAME}' in {AWS_REGION}...")

    try:
        response = dynamodb.create_table(
            TableName=TABLE_NAME,
            # Single-table design: PK + SK covers all entity types
            KeySchema=[
                {"AttributeName": "PK", "KeyType": "HASH"},   # Partition key
                {"AttributeName": "SK", "KeyType": "RANGE"},  # Sort key
            ],
            AttributeDefinitions=[
                {"AttributeName": "PK", "AttributeType": "S"},
                {"AttributeName": "SK", "AttributeType": "S"},
            ],
            # On-demand — no capacity planning, pay per request
            # Free tier covers hackathon + months of portfolio traffic
            BillingMode="PAY_PER_REQUEST",
            Tags=[
                {"Key": "project", "Value": "weldvision-ai"},
                {"Key": "hackathon", "Value": "h0-vercel-aws"},
                {"Key": "env", "Value": "production"},
            ],
        )

        waiter = dynamodb.get_waiter("table_exists")
        print("Waiting for table to become active...")
        waiter.wait(TableName=TABLE_NAME)

        print(f"\n✅ Table '{TABLE_NAME}' created successfully!")
        print(f"   Region:   {AWS_REGION}")
        print(f"   ARN:      {response['TableDescription']['TableArn']}")
        print(f"   Billing:  On-demand (pay per request)")
        print(f"   Status:   ACTIVE")
        print(f"\nAdd these to your Vercel environment variables:")
        print(f"   DYNAMODB_TABLE_NAME = {TABLE_NAME}")
        print(f"   AWS_REGION          = {AWS_REGION}")

    except ClientError as e:
        if e.response["Error"]["Code"] == "ResourceInUseException":
            print(f"✅ Table '{TABLE_NAME}' already exists — nothing to do.")
        else:
            print(f"❌ Error creating table: {e}")
            sys.exit(1)


if __name__ == "__main__":
    create_table()
