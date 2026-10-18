import { IsEmail, IsNotEmpty, IsString, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
    @ApiProperty({
        title: "Электронная почта",
        description: "Строковое значение от 8 до 128 символов длиной",
        example: "ex6mple@gmail.com"
    })
  @IsEmail()
  email!: string;

  @ApiProperty({
        title: "Пароль пользователя",
        description: "Строковое значение от 8 до 128 символов длиной",
        example: "ex@mplep@ssw0rd"
    })
    @IsString({message: 'Значение пароля должно быть строкой'})
    @IsNotEmpty({message: 'Значение пароля не должно быть пустым'})
    @Length(8, 128, {message:'Значение пароля должно быть в диапазоне от 8 до 128 символов'})
  password!: string;
}