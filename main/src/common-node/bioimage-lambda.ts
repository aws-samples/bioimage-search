
export const getResponseBody = (response: any) => {
    const payloadStr = response['Payload'].toString('utf-8')
    const payload = JSON.parse(payloadStr)
    if (payload.statusCode > 299) {
        throw new Error("lambda error")
    };
    const bodyObj = JSON.parse(payload.body)
    return bodyObj
}
