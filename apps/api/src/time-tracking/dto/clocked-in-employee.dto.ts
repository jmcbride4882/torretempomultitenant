export class ClockedInEmployeeDto {
  userId: string;
  userName: string;
  location: string | null;
  clockInTime: string; // ISO 8601
  duration: number; // minutes since clock-in
}
