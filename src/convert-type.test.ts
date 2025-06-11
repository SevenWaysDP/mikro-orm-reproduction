import {
  Entity,
  MikroORM,
  MongoPlatform,
  ObjectId,
  Platform,
  PrimaryKey,
  Property,
  Type,
} from "@mikro-orm/mongodb";

type EntityId = string;
export class ObjectIdType extends Type<EntityId, ObjectId> {
  public convertToDatabaseValue(value: EntityId, platform: Platform): ObjectId {
    // this.validatePlatformSupport(platform);

    return new ObjectId(value);
  }

  public convertToJSValue(value: ObjectId, platform: Platform): EntityId {
    // this.validatePlatformSupport(platform);
    console.log("convertToJSValue", value);

    return value.toHexString();
  }

  private validatePlatformSupport(platform: Platform): void {
    if (!(platform instanceof MongoPlatform)) {
      throw new Error("ObjectId custom type implemented only for Mongo.");
    }
  }
}

@Entity()
class User {
  @PrimaryKey()
  _id!: ObjectId;

  @Property()
  name: string;

  @Property({ unique: true })
  email: string;

  @Property({ type: ObjectIdType, nullable: true })
  accountId: EntityId;

  @Property({ nullable: true })
  deletedSince?: Date;

  constructor(name: string, email: string, accountId: string) {
    this.name = name;
    this.email = email;
    this.accountId = accountId;
  }
}

let orm: MikroORM;

beforeAll(async () => {
  orm = await MikroORM.init({
    dbName: ":memory:",
    entities: [User],
    debug: ["query", "query-params"],
    allowGlobalContext: true, // only for testing
  });
  await orm.schema.refreshDatabase();
});

afterAll(async () => {
  await orm.close(true);
});

describe("When accountId is a string", () => {
  test("ObjectIdType conversion FAILED", async () => {
    const testId = new ObjectId().toHexString();

    const count = await orm.em.count(User, { email: "foo" });
    expect(count).toBe(0);
    orm.em.create(User, {
      name: "Foo",
      email: "foo",
      accountId: testId,
    });
    await orm.em.flush();
    orm.em.clear();
    const number = await orm.em.nativeUpdate(
      User,
      { accountId: testId }, // <-- string
      { deletedSince: new Date() },
      { convertCustomTypes: true } as any
    );

    expect(number).toBe(1);
  });
});

describe("When accountId is a object id", () => {
  test("ObjectIdType conversion", async () => {
    const testId = new ObjectId().toHexString();

    const count = await orm.em.count(User, { email: "foo" });
    expect(count).toBe(0);
    orm.em.create(User, {
      name: "Foo",
      email: "foo",
      accountId: testId,
    });
    await orm.em.flush();
    orm.em.clear();
    const number = await orm.em.nativeUpdate(
      User,
      { accountId: new ObjectId(testId) as any }, // <-- forced to ObjectId
      { deletedSince: new Date() },
      { convertCustomTypes: true } as any
    );

    expect(number).toBe(1);
  });
});
