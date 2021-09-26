import { UserProfile } from 'src/dtos/user/userProfile.dto';
import { DistrictDocument } from 'src/entities/district.entity';
import { ProvinceDocument } from 'src/entities/province.entity';
import { UserDocument } from 'src/entities/user.entity';
import { WardDocument } from 'src/entities/ward.entity';

export class UsersHelper {
  public mapToUserProfile(user: UserDocument): UserProfile {
    const province = user.address.province as unknown as ProvinceDocument;
    const district = user.address.district as unknown as DistrictDocument;
    const ward = user.address.ward as unknown as WardDocument;
    return {
      email: user.email,
      displayName: user.displayName,
      birthday: user.birthday,
      avatar: user.avatar,
      coverPhoto: user.coverPhoto,
      address: {
        province: province?.name,
        district: district?.name,
        ward: ward?.name,
      },
    };
  }
  public generateString(length: number) {
    let result = '';
    const characters =
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const charactersLength = characters.length;
    for (let i = 0; i < length; i++) {
      result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
  }
  public removeTone(alias: string) {
    let str = alias;
    str = str.toLowerCase();
    str = str.replace(/à|á|ạ|ả|ã|â|ầ|ấ|ậ|ẩ|ẫ|ă|ằ|ắ|ặ|ẳ|ẵ/g, 'a');
    str = str.replace(/è|é|ẹ|ẻ|ẽ|ê|ề|ế|ệ|ể|ễ/g, 'e');
    str = str.replace(/ì|í|ị|ỉ|ĩ/g, 'i');
    str = str.replace(/ò|ó|ọ|ỏ|õ|ô|ồ|ố|ộ|ổ|ỗ|ơ|ờ|ớ|ợ|ở|ỡ/g, 'o');
    str = str.replace(/ù|ú|ụ|ủ|ũ|ư|ừ|ứ|ự|ử|ữ/g, 'u');
    str = str.replace(/ỳ|ý|ỵ|ỷ|ỹ/g, 'y');
    str = str.replace(/đ/g, 'd');
    str = str.replace(
      /!|@|%|\^|\*|\(|\)|\+|\=|\<|\>|\?|\/|,|\.|\:|\;|\'|\"|\&|\#|\[|\]|~|\$|_|`|-|{|}|\||\\/g,
      ' ',
    );
    str = str.replace(/ + /g, ' ');
    str = str.trim();
    return str;
  }
}
