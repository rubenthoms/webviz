export interface Entity {
    coordinates: [number, number];
}

export type EntityGroup<TEntity extends Entity> = Entity &
    TEntity & {
        entities: TEntity[];
        radius: number;
    };

export class ProximityGrouping<TEntity extends Entity> {
    private _entities: TEntity[] = [];

    constructor(entities: TEntity[]) {
        this._entities = entities;
    }

    private isWithinDistance(entity1: Entity, entity2: Entity, distance: number): boolean {
        const [x1, y1] = entity1.coordinates;
        const [x2, y2] = entity2.coordinates;

        return Math.sqrt((x1 - x2) ** 2 + (y1 - y2) ** 2) <= distance;
    }

    groupEntities(withInDistance: number): EntityGroup<TEntity>[] {
        const groups: EntityGroup<TEntity>[] = [];

        for (let i = 0; i < this._entities.length; i++) {
            const entity = this._entities[i];
            let group: EntityGroup<TEntity> | undefined = groups.find((group) =>
                this.isWithinDistance(group, entity, withInDistance)
            );

            if (!group) {
                group = {
                    ...entity,
                    coordinates: entity.coordinates,
                    radius: 0,
                    entities: [],
                };

                groups.push(group);
            } else {
                group.coordinates = [
                    (group.coordinates[0] * (group.entities?.length ?? 1) + entity.coordinates[0]) /
                        ((group.entities?.length ?? 1) + 1),
                    (group.coordinates[1] * (group.entities?.length ?? 1) + entity.coordinates[1]) /
                        ((group.entities?.length ?? 1) + 1),
                ];
                group.radius = Math.max(
                    group.radius,
                    Math.sqrt(
                        group.entities.reduce(
                            (acc, entity) =>
                                Math.max(
                                    acc,
                                    Math.sqrt(
                                        (entity.coordinates[0] - group!.coordinates[0]) ** 2 +
                                            (entity.coordinates[1] - group!.coordinates[1]) ** 2
                                    )
                                ),
                            0
                        )
                    )
                );
            }

            group.entities?.push(entity);
        }

        return groups;
    }
}
