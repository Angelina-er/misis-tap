import { model, Schema, Types } from "mongoose";
import MongoProto from "./mongoproto";

enum GenderType {
    male = "male",
    female = "female"
}

export interface ILookingFor {
    ageMax?: number;
    ageMin?: number;
    gender?: GenderType;
}
export interface IPerson {
    _id?: Types.ObjectId;
    tguserid: number;
    name?: string;
    gender?: GenderType;
    blocked: boolean;
    approxbirthdate?: Date;
    desc?: string;
    photos: [];
    lookingfor?: ILookingFor;
    created: Date;
    changed?: Date;
    awaitcommanddata?: string;
    history?: Array<any>;
}
export const LookingForSchema = new Schema({
    ageMax: {type: Number, require: false},
    ageMin: {type: Number, require: false},
    gender: {type: String, require: false},
})

export const PersonSchema = new Schema({
    tguserid: {type: Number, require: true, unique: true},
    name: {type: String, require: false},
    gender: {type: String, require: false},
    approxbirthdate: {type: Date, require: false},
    desc: {type: String, require: false},
    blocked: {type: Boolean, require: true},
    awaitcommanddata: {type: String, require: false},
    lookingfor: LookingForSchema,
    created: {type: Date, require: true},
    changed: {type: Date, require: false},
    history: {type: Array, require: false},
})

export const mongoPersons = model<IPerson>('persons', PersonSchema)

export default class Person extends MongoProto<IPerson> {
    constructor(id?: Types.ObjectId, data?: IPerson){
        super(mongoPersons, id, data);
    }
    static async getByTgUserId(tg_user_id: number | string): Promise<Person | undefined> {
        MongoProto.connectMongo();
        if (typeof tg_user_id === "string") tg_user_id = parseInt(tg_user_id as string);
        const ou = await mongoPersons.aggregate([{
            '$match': {'tguserid': tg_user_id,'blocked': false}
        }]);
        if (ou.length === 1) {
            const ret = ou[0];
            return new Person(undefined, ret);
        }
    }
    async setAwaitCommandData(awaitid?: string) {
        this.checkData();
        if (this.data !== undefined) {
            this.data.awaitcommanddata = awaitid;
            await this.save();
        }
    }

}
