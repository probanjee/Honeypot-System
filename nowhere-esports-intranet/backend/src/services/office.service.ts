import { officeRepository } from '../repositories/office.repository';
import { NotFoundError } from '../errors';

export class OfficeService {
  async getOffice(id: string): Promise<any> {
    const office = await officeRepository.findById(id);
    if (!office) {
      throw new NotFoundError('Office not found');
    }
    return office;
  }

  async listOffices(): Promise<any[]> {
    return officeRepository.findAll();
  }

  async createOffice(input: any): Promise<any> {
    return officeRepository.create(input);
  }

  async updateOffice(id: string, input: any): Promise<any> {
    const office = await officeRepository.findById(id);
    if (!office) {
      throw new NotFoundError('Office not found');
    }
    return officeRepository.update(id, input);
  }

  async deleteOffice(id: string): Promise<void> {
    const office = await officeRepository.findById(id);
    if (!office) {
      throw new NotFoundError('Office not found');
    }
    await officeRepository.delete(id);
  }
}

export const officeService = new OfficeService();
