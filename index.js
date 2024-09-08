const AWS = require('aws-sdk');
const sharp = require('sharp');

const s3 = new AWS.S3();

exports.handler = async (event) => {
    console.log("Event Received: ", JSON.stringify(event, null, 2));  // 打印传入的事件

    if (!event.Records || event.Records.length === 0) {
        return {
            statusCode: 400,
            body: 'No records found in the event',
        };
    }

    const bucket = event.Records[0].s3.bucket.name;
    const key = event.Records[0].s3.object.key;


    try {
        const originalImage = await s3.getObject({ Bucket: bucket, Key: key }).promise();

        const metadata = await sharp(originalImage.Body).metadata();
        let contentType = 'image/jpeg';
        if (metadata.format) {
            contentType = `image/${metadata.format}`;
        }
        const originalWidth = metadata.width;
        const originalHeight = metadata.height;
        console.log(`Original dimensions: ${originalWidth}x${originalHeight}`);

        const targetWidth = 700;  // 你希望设定的宽度
        const targetHeight = Math.round((originalHeight / originalWidth) * targetWidth);
        console.log(`Resizing to: ${targetWidth}x${targetHeight}`);

        // 使用 sharp 处理图片，保持宽高比
        const resizedImage = await sharp(originalImage.Body)
            .resize({ width: targetWidth, height: targetHeight })
            .toBuffer();
        console.log("finished sharping original Image: ");

        console.log("Start putting image: ", contentType);
        const newKey = key.replace('uploads/', 'processed/');
        await s3.putObject({
            Bucket: bucket,
            Key: newKey,
            Body: resizedImage,
            ContentType: contentType
        }).promise();

        console.log("finished putting image: ");
        return {
            statusCode: 200,
            body: `Image resized and saved to ${newKey}`,
        };
    } catch (error) {
        console.error(error);
        return {
            statusCode: 500,
            body: 'Error processing image',
        };
    }
};