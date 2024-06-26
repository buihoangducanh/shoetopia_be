import mongoose, { Model, FilterQuery, QueryOptions, Document } from 'mongoose';

export class BaseRepository<T extends Document> {
  constructor(
    private readonly model: Model<T>,
    private readonly _populateKeys?: string[],
  ) {
    this._populateKeys = _populateKeys ?? [];
  }

  async create(createData: unknown): Promise<any> {
    const createdEntity = new this.model(createData);
    const savedEntity = await createdEntity.save();
    return this.model
      .findById(savedEntity._id)
      .populate(this._populateKeys)
      .lean()
      .exec();
  }

  async findById(id: string, option?: QueryOptions): Promise<T> {
    return this.model
      .findById(id, option)
      .populate(this._populateKeys)
      .lean()
      .exec() as Promise<T>;
  }

  async findByCondition(
    filter: FilterQuery<T>,
    field?: any | null,
    option?: any | null,
  ): Promise<T> {
    return this.model
      .findOne(filter, field, option)
      .populate(this._populateKeys)
      .lean()
      .exec() as Promise<T>;
  }

  async getByCondition(
    filter: FilterQuery<T>,
    field?: any | null,
    option?: any | null,
  ): Promise<T[]> {
    return this.model
      .find(filter, field, option)
      .populate(this._populateKeys)
      .lean()
      .exec() as Promise<T[]>;
  }

  async findAll(
    page: number,
    limit: number,
    filter?: FilterQuery<T>,
  ): Promise<T[]> {
    const skip = (page - 1) * limit;
    return this.model
      .find(filter)
      .skip(skip)
      .limit(limit)
      .populate(this._populateKeys)
      .lean()
      .exec() as any;
  }
  async findAllWithFullFilters(
    page: number,
    limit: number,
    filter?: FilterQuery<T>,
    sortBy?: string,
    order?: 'asc' | 'desc',
  ): Promise<{ data: T[]; totalPage: number; totalDocs: number }> {
    const skip = (page - 1) * limit;
    const sortOption: { [key: string]: 1 | -1 } = {};
    if (sortBy) {
      sortOption[sortBy] = order === 'asc' ? 1 : -1;
    }

    const data = (await this.model
      .find(filter)
      .sort(sortOption)
      .skip(skip)
      .limit(limit)
      .populate(this._populateKeys)
      .lean()
      .exec()) as any;
    const totalDocs = await this.model.countDocuments(filter);
    const totalPage = Math.ceil(totalDocs / limit);
    return { data, totalPage, totalDocs };
  }

  async aggregate(option: any) {
    return this.model.aggregate(option);
  }

  async populate(result: T[], option: any) {
    return await this.model.populate(result, option);
  }

  async deleteOne(id: string) {
    return this.model.deleteOne({ _id: id } as FilterQuery<T>).lean();
  }

  async deleteMany(id: string[]) {
    return this.model.deleteMany({ _id: { $in: id } } as FilterQuery<T>).lean();
  }

  async deleteByCondition(filter?: FilterQuery<T>) {
    return this.model.deleteMany(filter).lean();
  }

  async findByConditionAndUpdate(
    filter: FilterQuery<T>,
    updateData: Partial<T>,
    option?: any | null,
  ) {
    return this.model
      .findOneAndUpdate(filter as FilterQuery<T>, updateData, {
        ...option,
        new: true,
      })
      .lean();
  }

  async updateMany(
    filter: FilterQuery<T>,
    updateData: Partial<T>,
    option?: any | null,
  ) {
    return this.model
      .updateMany(filter, updateData, option)
      .populate(this._populateKeys)
      .lean()
      .exec();
  }

  async findByIdAndUpdate(
    id: mongoose.ObjectId | string,
    updateData: Partial<T>,
  ) {
    return this.model
      .findByIdAndUpdate(id, updateData, { new: true })
      .populate(this._populateKeys)
      .lean()
      .exec();
  }
}
