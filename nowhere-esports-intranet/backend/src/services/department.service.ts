import { departmentRepository } from '../repositories/department.repository';
import { NotFoundError } from '../errors';

export class DepartmentService {
  async getDepartment(id: string): Promise<any> {
    const department = await departmentRepository.findById(id);
    if (!department) {
      throw new NotFoundError('Department not found');
    }
    return department;
  }

  async listDepartments(): Promise<any[]> {
    return departmentRepository.findAll();
  }

  async createDepartment(input: any): Promise<any> {
    return departmentRepository.create(input);
  }

  async updateDepartment(id: string, input: any): Promise<any> {
    const department = await departmentRepository.findById(id);
    if (!department) {
      throw new NotFoundError('Department not found');
    }
    return departmentRepository.update(id, input);
  }

  async deleteDepartment(id: string): Promise<void> {
    const department = await departmentRepository.findById(id);
    if (!department) {
      throw new NotFoundError('Department not found');
    }
    await departmentRepository.delete(id);
  }

  async getStatistics(): Promise<any[]> {
    return departmentRepository.getStatistics();
  }
}

export const departmentService = new DepartmentService();
