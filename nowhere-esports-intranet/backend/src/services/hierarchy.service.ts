import { hierarchyRepository } from '../repositories/hierarchy.repository';
import { employeeRepository } from '../repositories/employee.repository';
import { NotFoundError } from '../errors';

export class HierarchyService {
  async getManagerTree(empId: string): Promise<any[]> {
    const employee = await employeeRepository.findById(empId);
    if (!employee) {
      throw new NotFoundError('Employee not found');
    }
    return hierarchyRepository.getManagerTree(empId);
  }

  async getReportsTree(empId: string): Promise<any[]> {
    const employee = await employeeRepository.findById(empId);
    if (!employee) {
      throw new NotFoundError('Employee not found');
    }
    return hierarchyRepository.getReportsTree(empId);
  }
}

export const hierarchyService = new HierarchyService();
