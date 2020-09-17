def handler(event, context):
    return { 
        'input_bucket' : event['input_bucket'],
        'input_key' : event['input_key'],
        'output_bucket' : event['output_bucket'],
        'output_key' : event['output_key']
    }  
    