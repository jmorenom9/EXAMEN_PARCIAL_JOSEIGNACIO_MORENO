import { Collection } from "mongodb";
import { AuthorModel, Book, BookModel } from "./types.ts";


export const fromModelToBook = async (model: BookModel, authorsCollection: Collection<AuthorModel>): Promise<Book> => {
    const authors = await authorsCollection.find({_id: {$in: model.authors}}).toArray();
    return {
        id: model._id!.toString(),
        title: model.title,
        authors: authors.map((elem) => fromModelToAuthor(elem)),
        available_copies: model.available_copies
    }
}

export const fromModelToAuthor = (model: AuthorModel) => ({
    id: model._id!.toString(),
    name: model.name,
    biography: model.biography
})