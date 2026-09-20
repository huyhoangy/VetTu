import axiosClient from './axiosClient';

const aiApi = {
  scanImage: (imageBase64, mimeType = 'image/jpeg') => {
    return axiosClient.post('/ai/scan-image', { imageBase64, mimeType });
  },

  parseVoiceText: (text) => {
    return axiosClient.post('/ai/parse-text', { text });
  },
};

export default aiApi;
