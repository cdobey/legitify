import { DataTypes, Model, Optional } from "sequelize";

import db from "../../config/db";

interface UserAttributes {
  id: string;
  username: string;
  passwordHash: string;
  role: string;
  orgName: string;
  createdAt?: Date;
  updatedAt?: Date;
}

// For creation, id is optional
type UserCreationAttributes = Optional<UserAttributes, "id">;

class User
  extends Model<UserAttributes, UserCreationAttributes>
  implements UserAttributes
{
  public id!: string;
  public username!: string;
  public passwordHash!: string;
  public role!: string;
  public orgName!: string;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

User.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    username: {
      type: DataTypes.STRING,
      unique: true,
      allowNull: false,
    },
    passwordHash: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    role: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    orgName: {
      type: DataTypes.STRING,
      allowNull: false,
    },
  },
  {
    sequelize: db,
    modelName: "User",
    tableName: "Users",
  }
);

export default User;
