import {ObjectId} from "mongodb"

export type BookModel = {
    _id?: ObjectId,
    title: string,
    authors: ObjectId[],
    available_copies: number
}

export type AuthorModel = {
    _id?: ObjectId,
    name: string,
    biography: string
}

export type Book = {
    id: string,
    title: string,
    authors: Author[],
    available_copies: number
}

export type Author = {
    id: string,
    name: string,
    biography: string
}