import TelegramBot from "node-telegram-bot-api";
import colours from "./colours";
import { Request, Response } from 'express';
import Person, { IPerson, mongoPersons } from "./person";
import { Types } from "mongoose";

export default async function telegram(c: any, req: Request, res: Response, bot: TelegramBot) {    
    const tgData: TelegramBot.Update = req.body;
    const tgUserId = tgData.callback_query?.message?.chat.id?tgData.callback_query?.message?.chat.id:tgData.message?.from?.id as number;

    console.log(`${colours.fg.blue}API: telegram function\n${JSON.stringify(tgData, undefined, 4)}${colours.reset}`);
    try {
        let personDraft = await Person.getByTgUserId(tgUserId);
        if (personDraft === undefined){
            personDraft = new Person(undefined, {
                tguserid: tgUserId,
                blocked: false,
                photos: [],
                created: new Date()
            });
            await personDraft.save();
        }

        if (tgData.callback_query !== undefined) {
            // it's callback
            await callback_process(tgData, bot, personDraft);
            return res.status(200).json("OK");
        }
        
        // it isn't callback. This message may be command or data from user or message to support
        await message_process(tgData, bot, personDraft);
        return res.status(200).json("OK");

    } catch (e) {
        bot.sendMessage(tgUserId, 'Извините, Ваш аккаунт не найден. Выполните команду /start');
        return res.status(200).json("User not found");
    }
}

async function callback_process(tgData: TelegramBot.Update, bot: TelegramBot, person: Person): Promise<boolean> {
    const callback = tgData.callback_query?.data as string;
    const chat_id = tgData.callback_query?.message?.chat.id as number;
    console.log(`Callback command '${callback}'`);
    const cbcommand = callback.split(':');
    switch(cbcommand[0]) {
        case 'setgroup':
//            await person.setGroup(cbcommand[1]);
//            bot.answerCallbackQuery(tgData.callback_query?.id as string, {text: `Группа выбрана`});
            break;
    }
    return true;
}

async function message_process(tgData: TelegramBot.Update, bot: TelegramBot, person: Person): Promise<boolean> {
    if (!await command_process(tgData, bot, person)) {
        const chat_id = tgData.message?.chat.id as number;
        const command_d = person.json.awaitcommanddata?.split(":", 2);
        if (command_d === undefined) return true; 
        switch (command_d[0]) {
/*            case "ProductLongName":
                bot.sendMessage(chat_id, "Теперь введите короткий идентификатор продукта");
                await person.setAwaitCommandData(`ProductShortName:${tgData.message?.text}`);
                break;
            case "ProductShortName":
                const name_candidate = tgData.message?.text as string;
                if (name_candidate?.includes(" ")) {
                    bot.sendMessage(chat_id, "Идентификатор продукта не должен содержать пробелы");
                    return true;
                } else {
                    const p = await Product.getByName(name_candidate);
                    if (p !== undefined) {
                        bot.sendMessage(chat_id, "Этот идентификатор уже использован. Придумайте новый и попробуйте снова");
                        return true;
                    } else {
                        const p = new Product(undefined, {
                            name: name_candidate,
                            owner: person.uid,
                            desc: command_d[1],
                            created: new Date(),
                            blocked: false
                        });
                        await p.save();
                        
                        await person.setAwaitCommandData();
                        bot.sendMessage(chat_id, "Продукт создан, проверьте баланс");
                    }
                }
                break;
                */
            default:
                await person.setAwaitCommandData();
                bot.sendMessage(chat_id, "Неизвестная команда");
        }
    }
    return true
}
async function command_process(tgData: TelegramBot.Update, bot: TelegramBot, person: Person): Promise<boolean> {
    // looking for bot-command from user
    const chat_id = tgData.message?.chat.id as number;
    const commands = tgData.message?.entities?.filter(v => v.type == "bot_command");
    if (!commands || !(commands as any).length ) return false;
    console.log(`command(s) found: ${tgData.message?.text}`);
    for (let [i, c] of Object.entries(commands as Array<TelegramBot.MessageEntity>)) {
        const command_name = tgData.message?.text?.substring(c.offset, c.offset + c.length);
        console.log(`${colours.fg.green}Processing command = '${command_name}'${colours.reset}`);
        const msg_arr = tgData.message?.text?.split(" ") as Array<string>;
        switch (command_name) {
            case '/start': 
                bot.sendMessage(chat_id, `Привет`, {reply_markup:{inline_keyboard:[[{text: "Get match", web_app:{url:`${process.env.tg_web_hook_server}/match.html`}}]]}});
                return true;
            case '/settings':
                return true;
            case '/help':
                const help = "/start - начать (получить Telegram ID) \n/balance - Мой текущий баланс\n/spend - позволяет вкладывать бобы в проекты или передавать их иным лицам\n/operations - отображает ваши последние 10 операций";
                bot.sendMessage(chat_id, help);
                return true;
            case "/broadcast":
                //if (person.json.emission === undefined || !person.json.emission) return true;
                const all_persons = await mongoPersons.aggregate<IPerson>([{$match: {"blocked": false}}]);
                all_persons.forEach((p, i)=> {
                    setTimeout(()=>bot.sendMessage(p.tguserid, msg_arr[1]), i * 2000);
                });
                return true;
            default: 
                bot.sendMessage(chat_id, `'${command_name}' is unknoun command. Check your spelling`);
                return true;
        }
    }
    return false;
}
