import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { AccessTokenDTO } from '../common/dto/walmart-api.dto';

/**
 * AuthEndpointService - Walmart API authentication operations
 * 
 * Fully compatible with the C# Services/AuthEndpointService.cs.
 * Obtains OAuth2 tokens for Walmart Marketplace API access.
 */
@Injectable()
export class AuthEndpointService {
  private readonly logger = new Logger(AuthEndpointService.name);
  private readonly endpointService: string;
  private readonly serviceName: string;

  constructor(private readonly configService: ConfigService) {
    this.endpointService = this.configService.get<string>(
      'WALMART_API_BASE_URL',
      'https://marketplace.walmartapis.com/v3',
    );
    this.serviceName = this.configService.get<string>(
      'WALMART_SERVICE_NAME',
      'Walmart Service Name',
    );
  }

  /**
   * Generates a Walmart API access token
   * 
   * @param clientId - Walmart Client ID
   * @param clientSecret - Walmart Client Secret
   * @returns Access token string
   */
  async generateAccessToken(clientId: string, clientSecret: string): Promise<string> {
    try {
      const reqUrl = `${this.endpointService}/token`;

      // Base64 encode credentials
      const basicAuthEncoded = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

      const response = await axios.post(
        reqUrl,
        'grant_type=client_credentials',
        {
          headers: {
            'Authorization': `Basic ${basicAuthEncoded}`,
            'Accept': 'application/json',
            'Content-Type': 'application/x-www-form-urlencoded',
            'WM_QOS.CORRELATION_ID': this.generateUniqueID(),
            'WM_SVC.NAME': this.serviceName,
          },
        },
      );

      if (response.status === 200) {
        const accessToken: AccessTokenDTO = response.data;
        return accessToken.access_token;
      } else {
        throw new Error(`AuthError: ${JSON.stringify(response.data)}`);
      }
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        throw new Error(`AuthError: ${JSON.stringify(error.response.data)}`);
      }
      throw error;
    }
  }

  /**
   * Generates a unique correlation ID
   */
  private generateUniqueID(): string {
    return uuidv4();
  }
}
