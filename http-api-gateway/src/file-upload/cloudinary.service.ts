import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary } from 'cloudinary';

@Injectable()
export class CloudinaryService {
  constructor(private readonly configService: ConfigService) {
    cloudinary.config({
      cloud_name: this.configService.get('CLOUDINARY_CLOUD_NAME'),
      api_key: this.configService.get('CLOUDINARY_API_KEY'),
      api_secret: this.configService.get('CLOUDINARY_API_SECRET'),
    });
  }

  private getResourceType(file: Express.Multer.File): 'image' | 'video' {
    const fileType = file.mimetype.split('/')[0];
    return fileType === 'image' ? 'image' : 'video';
  }

  async uploadFile(file: Express.Multer.File): Promise<any> {
    try {
      const resourceType = this.getResourceType(file);

      const result = await new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            resource_type: resourceType,
            public_id: file.originalname,
          },
          (error, result) => {
            if (error) {
              reject(error);
            } else {
              resolve(result);
            }
          },
        );

        uploadStream.end(file.buffer);
      });

      return result;
    } catch (error) {
      console.error('Cloudinary upload error:', error);
      throw new Error('Cloudinary upload failed');
    }
  }

  //   async uploadFile(file: Express.Multer.File): Promise<any> {
  //     try {
  //       const result = await new Promise((resolve, reject) => {
  //         const uploadStream = cloudinary.uploader.upload_stream(
  //           (error, result) => {
  //             if (error) {
  //               reject(error);
  //             } else {
  //               resolve(result);
  //             }
  //           },
  //         );

  //         uploadStream.end(file.buffer);
  //       });

  //       return result;
  //     } catch (error) {
  //       console.error('Cloudinary upload error:', error);
  //       throw error;
  //     }
  //   }

  async deleteFile(publicId: string): Promise<void> {
    try {
      await cloudinary.uploader.destroy(publicId);
      console.log({ msg: 'Image deleted successfully' });
    } catch (error) {
      console.error('Cloudinary delete error:', error);
      throw error;
    }
  }
}
