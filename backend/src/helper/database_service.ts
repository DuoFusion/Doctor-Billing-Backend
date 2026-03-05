// simple database helpers for controllers

//=================Get Data================
export const getData = async (model: any, criteria: any = {}, projection: any = {}, options: any = {}) => {
    options.lean = true;
    return model.find(criteria, projection, options);
};

//=================Get First Match================
export const getFirstMatch = async (model: any, criteria: any = {}, projection: any = {}, options: any = {}) => {
    options.lean = true;
    return model.findOne(criteria, projection, options);
};

//=================Count Data================
export const countData = async (model: any, criteria: any = {}) => {
    return model.countDocuments(criteria);
};

//=================Create Data================
export const createData = async (model: any, payload: any) => {
    return model.create(payload);
};

//=================Insert Many================
export const insertMany = async (model: any, docs: any[], options: any = {}) => {
    return model.insertMany(docs, options);
};

//=================Update Data================
export const updateData = async (model: any, criteria: any = {}, update: any = {}, options: any = {}) => {
    return model.findOneAndUpdate(criteria, update, options);
};

//=================Update Many================
export const updateMany = async (model: any, criteria: any = {}, update: any = {}, options: any = {}) => {
    return model.updateMany(criteria, update, options);
};

//=================Aggregate Data================
export const aggregateData = async (model: any, pipeline: any[] = []) => {
    return model.aggregate(pipeline);
};

//=================Aggregate With Sorting================
export const aggregateDataWithSorting = async (model: any, pipeline: any[] = []) => {
    return model.aggregate(pipeline).collation({ locale: "en" });
};

//=================Aggregate And Populate================
export const aggregateAndPopulate = async (model: any, pipeline: any[] = [], populate: any) => {
    const agg = model.aggregate(pipeline);
    if (populate) agg.lookup(populate);
    return agg.exec();
};

//=================Find One And Populate================
export const findOneAndPopulate = async (model: any, criteria: any = {}, projection: any = {}, options: any = {}, populate: any = undefined) => {
    options.lean = true;
    let q = model.findOne(criteria, projection, options);
    if (populate) q = q.populate(populate);
    return q.exec();
};

//=================Find All With Populate================
export const findAllWithPopulate = async (model: any, criteria: any = {}, projection: any = {}, options: any = {}, populate: any = undefined) => {
    options.lean = true;
    let q = model.find(criteria, projection, options);
    if (populate) q = q.populate(populate);
    return q.exec();
};

//=================Find All With Populate With Sorting================
export const findAllWithPopulateWithSorting = async (model: any, criteria: any = {}, projection: any = {}, options: any = {}, populate: any = undefined) => {
    options.lean = true;
    let q = model.find(criteria, projection, options);
    if (populate) q = q.populate(populate);
    return q.collation({ locale: "en" }).exec();
};

