import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Folder, FolderOpen, File, ChevronRight, ChevronDown } from 'lucide-react';

const FileTreeNode = ({ fileName, nodes, level = 0 }) => {
    const isDir = nodes !== null && typeof nodes === 'object';
    const [isOpen, setIsOpen] = useState(false);

    const toggleOpen = () => {
        if (isDir) setIsOpen(!isOpen);
    };

    return (
        <div className="file-tree-node">
            <div 
                className={`file-tree-item ${isDir ? 'is-dir' : 'is-file'}`} 
                style={{ paddingLeft: `${level * 16 + 8}px` }}
                onClick={toggleOpen}
            >
                <span className="file-icon-wrapper">
                    {isDir ? (
                        isOpen ? <ChevronDown size={14} className="chevron" /> : <ChevronRight size={14} className="chevron" />
                    ) : <span style={{ width: 14, display: 'inline-block' }} />}
                </span>
                <span className="file-icon">
                    {isDir ? (
                        isOpen ? <FolderOpen size={16} className="folder-icon" /> : <Folder size={16} className="folder-icon" />
                    ) : (
                        <File size={16} className="file-icon-single" />
                    )}
                </span>
                <span className="file-name">{fileName}</span>
            </div>

            {isDir && (
                <AnimatePresence>
                    {isOpen && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            style={{ overflow: 'hidden' }}
                        >
                            <div className="file-tree-children">
                                {Object.keys(nodes).map(child => (
                                    <FileTreeNode 
                                        key={child} 
                                        fileName={child} 
                                        nodes={nodes[child]} 
                                        level={level + 1} 
                                    />
                                ))}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            )}
        </div>
    );
};

const FileTree = ({ tree }) => {
    if (!tree) return null;
    
    return (
        <div className="file-tree-root">
            <div className="file-tree-header">EXPLORER</div>
            <div className="file-tree-content">
                {Object.keys(tree).map(child => (
                     <FileTreeNode key={child} fileName={child} nodes={tree[child]} level={0} />
                ))}
            </div>
        </div>
    );
};

export default FileTree;
