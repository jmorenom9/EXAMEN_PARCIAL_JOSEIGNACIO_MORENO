import { MongoClient, ObjectId } from "mongodb";
import { AuthorModel, Book, BookModel } from "./types.ts";
import { fromModelToAuthor, fromModelToBook } from "./utils.ts";

const MONGO_URL = Deno.env.get("MONGO_URL");

if (!MONGO_URL) {
  console.error("You have to provide an url!");
  Deno.exit(1);
}

const client = new MongoClient(MONGO_URL);
await client.connect();
console.info("Mongodb connected!");

const db = client.db("biblioteca");

const booksCollection = db.collection<BookModel>("books");
const authorsCollection = db.collection<AuthorModel>("authors");

const handler = async (req: Request): Promise<Response> => {
  try {
    const method = req.method;
    const url = new URL(req.url);
    const path = url.pathname;

    if (method === "POST") {
      if (path === "/book") {
        const book = await req.json();
        if (!book) return new Response("Bad request", {status: 400});
        if (!book.title || !book.authors) return new Response("El título y los autores son campos requeridos.", {status: 400});
        const authorsExists = await authorsCollection.find({_id: {$in: book.authors.map((elem: string) => new ObjectId(elem))}}).toArray();
        if (authorsExists.length !== book.authors.length) return new Response("Autor no existe", {status: 400});
        const newBook = await booksCollection.insertOne({
          _id: new ObjectId(),
          title: book.title,
          authors: book.authors.map((elem: string) => new ObjectId(elem)),
          available_copies: book.available_copies
        });
        return new Response("Libro creado correctamente " + JSON.stringify({id: book.id, title: book.title, authors: book.authors, available_copies: book.available_copies}), {status: 201});
      } else if (path === "/author") {
        const author = await req.json();
        if (!author) return new Response("Bad request", {status: 400});
        if (!author.name || !author.biography) return new Response("El nombre del autor y la biografía son campos requeridos.", {status: 400});
        const newAuthor = await authorsCollection.insertOne({
          _id: new ObjectId(),
          name: author.name,
          biography: author.biography
        });
        return new Response("Autor creado correctamente " + JSON.stringify({name: author.name, biography: author.biography}), {status: 201});
      }
    } else if (method === "GET") {
      if (path === "/books") {
        const title = url.searchParams.get("title");
        if (title) {
          const findBook = await booksCollection.findOne({title: title});
          if (!findBook) return new Response("Libro no encontrado.", {status: 404});
          const finalBook = await fromModelToBook(findBook, authorsCollection);
          return new Response(JSON.stringify(finalBook), {status: 200});
        }
        const books = await booksCollection.find().toArray();
        const finalBooks = await Promise.all(
          books.map((elem) => fromModelToBook(elem, authorsCollection))
        );
        return new Response(JSON.stringify(finalBooks), {status: 200});
      } else if (path === "/authors") {
        const authors = await authorsCollection.find().toArray();
        const finalAuthors = await authors.map((elem) => fromModelToAuthor(elem));
        return new Response(JSON.stringify(finalAuthors), {status: 200});
      } else if (path === "/book") {
        const id = url.searchParams.get("id");
        if (id) {
          const findBook = await booksCollection.findOne({_id: new ObjectId(id)});
          if (!findBook) return new Response("Libro no encontrado.", {status: 404});
          const finalBook = await fromModelToBook(findBook, authorsCollection);
          return new Response(JSON.stringify(finalBook), {status: 200});
        } else {
          return new Response("NO id at url", {status: 400});
        }
      }
    } else if (method === "PUT") {
      if (path === "/book") {
        const book = await req.json();
        if (!book) return new Response("Bad request", {status: 400});
        if (!book.title || !book.authors || !book.available_copies) return new Response("Faltan campos", {status: 400});
        const authorsExists = await authorsCollection.find({_id: {$in: book.authors.map((elem: string) => new ObjectId(elem))}}).toArray();
        if (authorsExists.length !== book.authors.length) return new Response("Autor no existe", {status: 400});
        const idBookExists = await booksCollection.findOne({_id: new ObjectId(book.id as string)});
        if (!idBookExists) return new Response("El ID del libro no existe.", {status: 404});
        const updateBook = await booksCollection.updateOne({_id: new ObjectId(book.id as string)}, {$set: {
          title: book.title,
          authors: book.authors.map((elem: string) => new ObjectId(elem)),
          available_copies: book.available_copies
        }});
        return new Response("Libro actualizado correctamente " + JSON.stringify({id: book.id, title: book.title, authors: book.authors, available_copies: book.available_copies}), {status: 200});
      }
    } else if (method === "DELETE") {
      if (path === "/book") {
        const book = await req.json();
        if (!book) return new Response("Bad request", {status: 400});
        if (!book.id) return new Response("No id at body", {status: 400});
        const findBook = await booksCollection.findOne({_id: new ObjectId(book.id as string)});
        if (!findBook) return new Response("Libro no encontrado.", {status: 404});
        const deleteBook = await booksCollection.deleteOne({_id: new ObjectId(book.id as string)});
        return new Response("Libro eliminado exitosamente.", {status: 200});
      }
    }

    return new Response(`La ruta ${path} no existe`, {status: 500});

  } catch (error) {
    console.log(error);
    throw new Error("error");
  }
}

Deno.serve({port: 3000}, handler);