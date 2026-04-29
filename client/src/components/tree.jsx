const FileTreeNode = ({ fileName, nodes }) => {
    return (
        <div>
            {fileName}
            {nodes &&
                <ul>
                    {Object.keys(nodes).map(child => (
                        <li key={child}>
                            <FileTreeNode fileName={child} nodes={nodes[child]} />
                        </li>
                    ))}
                </ul>
            }
        </div>
    )
}
const FileTree = ({ tree }) => {
    return (
        <div>
            <FileTreeNode fileName={"/"} nodes={tree} />
        </div>
    )
}

export default FileTree

