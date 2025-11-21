export interface UserDto {
  id?: number;
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  role?: string;
  createdAt?: Date;
}
