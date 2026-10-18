import { IsEmail, IsNotEmpty, IsOptional, IsString, Matches, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterDto {
    @ApiProperty({
        title: "ФИО пользователя",
        description: "Строковое значение",
        example: "Иванов Иван Иванович"
    })
  @IsString()
  @IsNotEmpty()
  fullName!: string;

  @ApiProperty({
        title: "Электронная почта",
        description: "Строковое значение от 8 до 128 символов длиной",
        example: "ex6mple@gmail.com"
    })
  @IsEmail()
  email!: string;

  @ApiProperty({
        title: "Номер телефона",
        description: "Строковое значение",
        example: "+375291111111"
    })
  @IsOptional()
  @IsString()
  @Matches(/^\+?[0-9 \-()]{7,20}$/, { message: 'Некорректный формат телефона' })
  phone?: string;

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