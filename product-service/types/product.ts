export type ProductItem = {
    id: string;
    title: string;
    description: string;
    platform: string;
    genre: string;
    price: number;
    rating: number;
};

export type ProductItemFull = {
    id: number;
    title: string;
    description: string;
    platform: string;
    genre: string;
    price: number;
    rating: number;
    count: number;
};
