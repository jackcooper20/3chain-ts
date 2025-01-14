import * as dotenv from "dotenv";
import { RetrievalQA } from "langchain/chains";
import { ChatOpenAI } from "langchain/chat_models";
import { load_embeddings, load_db } from "./utils";
import { get_crypto_prices } from "./crypto_tracker";
import * as constants from "./constants";
import * as readlineSync from "readline-sync";

dotenv.config();

class RetrievalChat {
  private qa: RetrievalQA;
  private conversation_history: string;

  constructor(apiKey: string) {
    process.env.OPENAI_API_KEY = apiKey;

    // Initialize bot components
    const embeddingFunction = load_embeddings();
    const db = load_db(embeddingFunction);
    this.qa = RetrievalQA.from_llm({
      llm: new ChatOpenAI({ temperature: 0.1 }),
      retriever: db.as_retriever({ k: 7 }),
      return_source_documents: true,
    });

    this.conversation_history = "";
  }

  public answerQuestion(question: string): string {
    this.conversation_history += `User: ${question}\n`;

    const output = this.qa({ query: this.conversation_history });

    const botResponse = output.result.replace("Ella: ", "");

    this.conversation_history += `Ella: ${botResponse}\n`;

    return botResponse;
  }

  public welcome(): void {
    console.log("Ella: Welcome! What are we exploring today?");
  }
}

const apiKey = constants.API_KEY;

const qa = new RetrievalChat(apiKey);

qa.welcome();

while (true) {
  const query = readlineSync.question("User: ");
  if (query.toLowerCase() === "exit") {
    const confirmation = readlineSync.question(
      "Ella: Are you sure you want to exit the chat? (y/n): "
    );
    if (confirmation.toLowerCase() === "y") {
      break;
    }
  } else if (query.toLowerCase() === "reset") {
    qa.conversation_history = "";
    console.log("Ella: Conversation reset.");
  } else if (query.toLowerCase() === "check crypto") {
    const cryptoReport = get_crypto_prices();
    console.log(cryptoReport);
  } else if (query.toLowerCase() === "new contract") {
    console.log("Available contract types:");
    console.log("1. Smart Contract");
    console.log("0. Quit");
    const userInput = readlineSync.question(
      "Ella: Please enter the corresponding number: "
    );

    if (userInput === "1") {
      const { exec } = require("child_process");
      exec(
        "python smartcontract_build.py",
        (error: any, stdout: string, stderr: string) => {
          if (error) {
            console.error(`exec error: ${error}`);
            return;
          }
          console.log(stdout);
        }
      );
    } else if (userInput === "0") {
      continue;
    } else {
      console.log("Ella: Invalid input. Please enter a valid number.");
    }
    console.log();
  } else {
    const response = qa.answerQuestion(query);
    console.log(`Ella: ${response}`);
    console.log();
  }
}
