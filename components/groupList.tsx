import GroupItem from "@/components/groupItem";

interface Group {
    name: string;
    id: string;
    owner: string;
}

interface GList {
    groups: Group[];
}

const GroupList: React.FC<GList> = ({ groups }) => {
    
    return (
        <div>
            <ul>
                {groups.map((group, index) => (
                    <li key={index}>
                        <GroupItem name={group.name} id={group.id} owner={group.owner} />
                    </li>
                ))}
            </ul>
        </div>
    )
}

export default GroupList