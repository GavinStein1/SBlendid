interface Group {
    name: string;
    id: string;
    owner: string;
}

const GroupItem: React.FC<Group> = ({ name, id, owner }) => {

    return (
        <div id={id}>
            <h2>{name}</h2>
            <p>created by: {owner}</p>
        </div>
    )
}

export default GroupItem;